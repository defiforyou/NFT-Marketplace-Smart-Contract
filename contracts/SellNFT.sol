// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./DefiForYouNFT.sol";
import "./dfy-nft/DfyNFTLib.sol";

//:todo : replace transfer bettwen account -> transfer to contract

contract SellNFT is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using ERC165CheckerUpgradeable for address;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 public marketFeeRate;
    address payable public marketFeeWallet;
    uint256 public ZOOM;

    CountersUpgradeable.Counter private _orderIdCounter;
    mapping(uint256 => Order) public orders;

    struct Order {
        address collectionAddress;
        address payable seller;
        uint256 tokenId;
        uint256 numberOfCopies;
        uint256 price;
        address currency;
        OrderStatus status;
    }

    enum OrderStatus {
        ON_SALES,
        COMPLETED
    }

    enum CollectionStandard {
        UNDEFINED,
        ERC721,
        ERC1155
    }

    event NFTPutOnSales(
        uint256 orderId,
        Order order,
        uint256 marketFee,
        OrderStatus orderStatus
    );

    event NFTBought(
        uint256 orderId,
        address buyer,
        address collection,
        uint256 tokenId,
        uint256 numberOfCopies,
        uint256 price,
        address currency,
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

    function setFeeWallet(address payable _feeWallet)
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
        uint256 numberOfCopies,
        uint256 price,
        address currency,
        address collectionAddress
    ) external whenContractNotPaused {
        
        _verifyOrderInfo(
            collectionAddress,
            tokenId,
            numberOfCopies,
            msg.sender
        );

        //TODO: Extend support to other NFT standards. Only ERC-721 is supported at the moment.
        require(
            DefiForYouNFT(collectionAddress).ownerOf(tokenId) == msg.sender,
            "Not token owner"
        );
        require(
            DefiForYouNFT(collectionAddress).isApprovedForAll(msg.sender, address(this)),
            "Spender is not approved"
        );
        require(price > 0, "Invalid price");

        uint256 orderId = _orderIdCounter.current();

        Order storage _order = orders[orderId];
        _order.seller = payable(msg.sender);
        _order.tokenId = tokenId;
        _order.collectionAddress = collectionAddress;
        _order.currency = currency;
        _order.price = price;
        _order.status = OrderStatus.ON_SALES;
        // TODO: Check against NFT standards for valid number of copies from function input
        _order.numberOfCopies = numberOfCopies;

        _orderIdCounter.increment();

        uint256 marketFee = DfyNFTLib.calculateSystemFee(
            _order.price,
            marketFeeRate,
            ZOOM
        );

        emit NFTPutOnSales(orderId, _order, marketFee, _order.status);
    }

    function cancelListing(uint256 orderId) external whenContractNotPaused {
        Order storage _order = orders[orderId];

        require(msg.sender == _order.seller, "Order's seller is required");

        // Delete order from order list
        delete orders[orderId];

        emit NFTCancelSales(orderId);
    }

    function buyNFT(uint256 orderId, uint256 numberOfCopies)
        external
        payable
        whenContractNotPaused
    {
        Order storage _order = orders[orderId];

        CollectionStandard _standard = _verifyOrderInfo(
            _order.collectionAddress,
            _order.tokenId,
            _order.numberOfCopies,
            _order.seller
        );

        require(msg.sender != _order.seller, "Buying owned NFT");
       
        uint256 _royaltyFee;
        // Calculate market fee
        uint256 _marketFee = DfyNFTLib.calculateSystemFee(
            _order.price,
            marketFeeRate,
            ZOOM
        );
        
        // Buying ERC-721 token, single copy only
        uint256 _totalPaidAmount = _order.price;

        if(_standard == CollectionStandard.ERC1155) {
            // Buying ERC-1155 token, multiple copies
            _totalPaidAmount = _order.price * numberOfCopies;
            _marketFee *= numberOfCopies;
        }

        // Transfer fund to contract
        DfyNFTLib.safeTransfer(
            _order.currency,
            msg.sender,
            address(this),
            _totalPaidAmount
        );

        if (
            DefiForYouNFT(_order.collectionAddress).originalCreator() ==
            _order.seller
        ) {
            // Seller is original creator -> only charge market fee

            // Calculate amount paid to seller = purchase price - market fee
            (bool success, uint256 amountPaidToSeller) = _order.price.trySub(
                _marketFee
            );
            require(success);

            // Transfer remaining amount to seller after deducting market fee
            DfyNFTLib.safeTransfer(
                _order.currency,
                address(this),
                _order.seller,
                amountPaidToSeller
            );

            // Transfer to market fee wallet
            DfyNFTLib.safeTransfer(
                _order.currency,
                address(this),
                marketFeeWallet,
                _marketFee
            );
        } else {
            // Seller is not the original creator -> charge royalty fee & market fee

            // Calculate royalty fee
            _royaltyFee = DfyNFTLib.calculateSystemFee(
                _order.price,
                DefiForYouNFT(_order.collectionAddress).royaltyRateByToken(
                    _order.tokenId
                ),
                ZOOM
            );

            if(_standard == CollectionStandard.ERC1155) {
                _royaltyFee *= numberOfCopies;
            }

            uint256 _totalFeeCharged = _marketFee + _royaltyFee;

            (bool success, uint256 amountPaidToSeller) = _order.price.trySub(
                _totalFeeCharged
            );
            require(success);

            if (_royaltyFee > 0) {
                // Transfer royalty fee to original creator of the collection
                DfyNFTLib.safeTransfer(
                    _order.currency,
                    address(this),
                    DefiForYouNFT(_order.collectionAddress).originalCreator(),
                    _royaltyFee
                );
            }

            // Transfer market fee to fee wallet
            DfyNFTLib.safeTransfer(
                _order.currency,
                address(this),
                marketFeeWallet,
                _marketFee
            );

            // Transfer remaining amount to seller after deducting market fee and royalty fee
            DfyNFTLib.safeTransfer(
                _order.currency,
                address(this),
                _order.seller,
                amountPaidToSeller
            );
        }

        // Transfer NFT to buyer
        // TODO: Extend support to ERC-1155
        DefiForYouNFT(_order.collectionAddress).safeTransferFrom(
            _order.seller,
            msg.sender,
            _order.tokenId
        );

        // If number of copies being purchased equal to listed number of copies,
        // mark the order as completed
        if (numberOfCopies == _order.numberOfCopies) {
            _order.status = OrderStatus.COMPLETED;
        }

        emit NFTBought(
            orderId,
            msg.sender,
            _order.collectionAddress,
            _order.tokenId,
            numberOfCopies,
            _order.price,
            _order.currency,
            _marketFee,
            _royaltyFee,
            block.timestamp,
            _order.status
        );
    }

    function _verifyOrderInfo(
        address collectionAddress,
        uint256 tokenId,
        uint256 numberOfCopies,
        address owner
    ) internal view returns (CollectionStandard _standard) {
        // Check for supported NFT standards
        if (collectionAddress.supportsInterface(type(IERC721).interfaceId)) {
            _standard = CollectionStandard.ERC721;

            require(numberOfCopies == 1, "ERC-721: Amount not supported");
        } else if (
            collectionAddress.supportsInterface(type(IERC1155).interfaceId)
        ) {
            _standard = CollectionStandard.ERC1155;

            // Check for seller's balance
            require(
                IERC1155(collectionAddress).balanceOf(owner, tokenId) >=
                    numberOfCopies,
                "ERC-1155: Insufficient balance"
            );
        } else {
            _standard = CollectionStandard.UNDEFINED;
        }

        require(
            _standard != CollectionStandard.UNDEFINED,
            "ERC-721 or ERC-1155 standard is required"
        );
    }

    function _calculateOrderFees(uint256 orderId, CollectionStandard standard) internal view {

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
