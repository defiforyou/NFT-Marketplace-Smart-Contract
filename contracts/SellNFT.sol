// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./DefiForYouNFT.sol";
import "./dfy-nft/DfyNFTLib.sol";

contract SellNFT is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 public marketFeeRate;
    address public marketFeeWallet;
    uint256 public ZOOM;

    CountersUpgradeable.Counter private _orderIdCounter;
    mapping(uint256 => Order) public orders;

    struct Order {
        address collectionAddress;
        address seller;
        uint256 tokenId;
        uint256 numberOfCopies;
        uint256 price;
        address currency;
        OrderStatus status;
    }

    enum OrderStatus {
        ON_SALES,
        NFT_BOUGHT
    }

    event NFTPutOnSales(
        uint256 orderId,
        Order order,
        uint256 marketFee,
        OrderStatus orderStatus
    );

    event NFTBought(
        uint256 orderId,
        uint256 tokenId,
        address collection,
        address buyer,
        uint256 price,
        uint256 marketFee,
        uint256 royaltyFee,
        uint256 timeOfPurchase,
        OrderStatus orderStatus
    );

    event NFTCancelSales(uint256 orderId);

    function initialize(uint256 _zoom) public initializer {
        __UUPSUpgradeable_init();
        __Pausable_init();

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);

        ZOOM = _zoom;
    }

    modifier whenContractNotPaused() {
        _whenNotPaused();
        _;
    }

    function _whenNotPaused() private view {
        require(!paused(), "Pausable: paused");
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unPause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function setFeeWallet(address _feeWallet)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        marketFeeWallet = _feeWallet;
    }

    function setMarketFeeRate(uint256 rate)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        marketFeeRate = rate;
    }

    function putOnSales(
        uint256 tokenId,
        uint256 price,
        address currency,
        address collectionAddress
    ) external whenContractNotPaused {
        //TODO: Extend support to other NFT standards

        require(
            DefiForYouNFT(collectionAddress).ownerOf(tokenId) == msg.sender,
            "seller not owner of tokenId"
        );
        require(
            DefiForYouNFT(collectionAddress).getApproved(tokenId) ==
                address(this),
            "tokenId is not approved"
        );
        require(price > 0, "invalid price");

        uint256 orderId = _orderIdCounter.current();

        Order storage _order = orders[orderId];
        _order.seller = msg.sender;
        _order.tokenId = tokenId;
        _order.collectionAddress = collectionAddress;
        _order.currency = currency;
        _order.price = price;
        _order.status = OrderStatus.ON_SALES;

        // TODO: Get number of copies from function input
        _order.numberOfCopies = 1;

        _orderIdCounter.increment();

        uint256 marketFee = DfyNFTLib.calculateSystemFee(
            _order.price,
            marketFeeRate,
            ZOOM
        );

        emit NFTPutOnSales(orderId, _order, marketFee, _order.status);
    }

    // event test(uint256 fee, uint256 royalty, uint256 zoom);

    function buyNFT(uint256 orderId) external payable whenContractNotPaused {
        Order storage _order = orders[orderId];

        uint256 royaltyFee;
        uint256 marketFee = DfyNFTLib.calculateSystemFee(
            _order.price,
            marketFeeRate,
            ZOOM
        );

        if (
            DefiForYouNFT(_order.collectionAddress).originalCreator() ==
            _order.seller
        ) {
            // Seller is original creator -> only charge market fee
            (bool success, uint256 remainMoney) = _order.price.trySub(
                marketFee
            );
            require(success, "market fee");

            // origin creator pay - 2,5% phí sàn
            DfyNFTLib.safeTransfer(
                _order.currency,
                msg.sender,
                _order.seller,
                remainMoney
            ); // 97,5 % of NFT to seller

            DfyNFTLib.safeTransfer(
                _order.currency,
                msg.sender,
                marketFeeWallet,
                marketFee
            ); // 2,5 % of NFT to fee wallet
        } else {
            // Seller is not the original creator -> charge royalty fee & market fee
            royaltyFee = DfyNFTLib.calculateSystemFee(
                _order.price,
                DefiForYouNFT(_order.collectionAddress).royaltyRateByToken(
                    _order.tokenId
                ),
                ZOOM
            );

            uint256 totalFeeCharged = marketFee + royaltyFee;
            (bool success, uint256 remainMoney) = _order.price.trySub(
                totalFeeCharged
            );

            require(success, "remain money");

            if (royaltyFee > 0) {
                DfyNFTLib.safeTransfer(
                    _order.currency,
                    msg.sender,
                    DefiForYouNFT(_order.collectionAddress).originalCreator(),
                    royaltyFee
                ); // remain transfer to origin
            }

            DfyNFTLib.safeTransfer(
                _order.currency,
                msg.sender,
                marketFeeWallet,
                marketFee
            ); // transfer 2,5 % of price NFT for FeeMarket

            DfyNFTLib.safeTransfer(
                _order.currency,
                msg.sender,
                _order.seller,
                remainMoney
            ); // remain transfer to seller
        }

        DefiForYouNFT(_order.collectionAddress).safeTransferFrom(
            _order.seller,
            msg.sender,
            _order.tokenId
        );

        _order.status = OrderStatus.NFT_BOUGHT;

        emit NFTBought(
            orderId,
            _order.tokenId,
            _order.collectionAddress,
            msg.sender,
            _order.price,
            marketFee,
            royaltyFee,
            block.timestamp,
            _order.status
        );
    }

    /** ==================== Standard interface function implementations ==================== */

    function _authorizeUpgrade(address)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
