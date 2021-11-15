// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./DefiForYouNFT.sol";
import "./dfy-nft/DfyNFTLib.sol";
import "./IBEP20.sol";

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

    struct Orders {
        address payable seller;
        uint256 tokenId;
        address collectionAddress;
        address currency;
        uint256 price;
        uint256 timeOfPurchase;
        uint256 numberOfCopies;
    }

    // IBEP20 public ibepDFY;
    IERC721 public assetNFT;

    mapping(uint256 => Orders) public orderOf;
    CountersUpgradeable.Counter private _orderIdCounter;

    uint256 public marketFee;
    address payable public walletFeeMarket;

    enum OrderStatus {
        NFT_BOUGHT,
        ON_SALES
    }

    event NFTPutOnSales(
        uint256 orderId,
        address collection,
        address owner,
        uint256 tokenId,
        uint256 numberOfCopies,
        uint256 price,
        address currency,
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

    function initialize() public initializer {
        __UUPSUpgradeable_init();
        __Pausable_init();

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);
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

    function setFeeWallet(address _walletFeeMarket)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        walletFeeMarket = payable(_walletFeeMarket);
    }

    function setMarketFee(uint256 fee) public onlyRole(DEFAULT_ADMIN_ROLE) {
        marketFee = fee;
    }

    function putOnSales(
        uint256 tokenId,
        uint256 price,
        address currency,
        address collectionAddress
    ) external whenContractNotPaused {
        assetNFT = IERC721(collectionAddress);
        require(
            assetNFT.ownerOf(tokenId) == msg.sender,
            "seller not owner of tokenId"
        );
        require(
            assetNFT.getApproved(tokenId) == address(this),
            "tokenId is not approved"
        );
        require(price > 0, "invalid price");

        uint256 orderId = _orderIdCounter.current();

        orderOf[orderId] = Orders({
            seller: payable(msg.sender),
            tokenId: tokenId,
            collectionAddress: collectionAddress,
            currency: currency,
            price: price,
            timeOfPurchase: block.timestamp,
            numberOfCopies: 1
        });

        _orderIdCounter.increment();
        Orders memory obj = orderOf[orderId];

        assetNFT.safeTransferFrom(msg.sender, address(this), tokenId);

        emit NFTPutOnSales(
            orderId,
            collectionAddress,
            msg.sender,
            tokenId,
            obj.numberOfCopies,
            price,
            currency,
            marketFee,
            OrderStatus.ON_SALES
        );
    }

    function buyNFT(uint256 orderId) external payable whenContractNotPaused {
        // todo : marketFee : 2,5 % of price nft
        // 10% of royalty Fee

        Orders storage obj = orderOf[orderId];

        // buyer transfer to contract
        DfyNFTLib.safeTransfer(
            obj.currency,
            msg.sender,
            address(this),
            obj.price
        );

        uint256 zoom = 1e5;

        uint256 buyNFTFee = DfyNFTLib.calculateSystemFee(
            obj.price,
            marketFee,
            zoom
        );

        // marketFee = DfyNFTLib.calculateSystemFee(obj.price, marketFee, zoom);

        uint256 remainMoney = obj.price.sub(buyNFTFee); // remaining amount after - marketFee

        // if có royalty fee
        if (
            DefiForYouNFT(obj.collectionAddress).originalCreator() == obj.seller
        ) {
            // origin creator pay - 2,5% phí sàn
            DfyNFTLib.safeTransfer(
                obj.currency,
                address(this),
                obj.seller,
                remainMoney
            ); // 97,5 % of NFT to seller
            DfyNFTLib.safeTransfer(
                obj.currency,
                address(this),
                walletFeeMarket,
                buyNFTFee
            ); // 2,5 % of NFT to fee wallet
        } else {
            // if royaltyFee và origin creater != seller
            uint256 royaltyFee = DfyNFTLib.calculateSystemFee(
                obj.price,
                DefiForYouNFT(obj.collectionAddress).royaltyRateByToken(
                    obj.tokenId
                ),
                zoom
            );
            uint256 afterN1 = obj.price.sub(buyNFTFee).sub(royaltyFee); // remaining amount after - royaltyFee

            if (
                DefiForYouNFT(obj.collectionAddress).royaltyRateByToken(
                    obj.tokenId
                ) != 0
            ) {
                DfyNFTLib.safeTransfer(
                    obj.currency,
                    address(this),
                    DefiForYouNFT(obj.collectionAddress).originalCreator(),
                    royaltyFee
                ); // transfer 10% royaltyFee to origin creator
            }

            DfyNFTLib.safeTransfer(
                obj.currency,
                address(this),
                walletFeeMarket,
                buyNFTFee
            ); // transfer 2,5 % of price NFT for FeeMarket

            DfyNFTLib.safeTransfer(
                obj.currency,
                address(this),
                obj.seller,
                afterN1
            ); // remain transfer to seller
        }

        assetNFT.safeTransferFrom(address(this), msg.sender, obj.tokenId);

        emit NFTBought(
            orderId,
            obj.tokenId,
            obj.collectionAddress,
            msg.sender,
            obj.price,
            marketFee,
            DefiForYouNFT(obj.collectionAddress).royaltyRateByToken(
                obj.tokenId
            ),
            obj.timeOfPurchase,
            OrderStatus.NFT_BOUGHT
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
