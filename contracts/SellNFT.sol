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
import "./dfy-nft/DefiForYouNFT.sol";
import "./libs/CommonLib.sol";
import "./hub/HubInterface.sol";

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

    address public contractHub;

    CountersUpgradeable.Counter private _orderIdCounter;
    mapping(uint256 => Order) public orders;

    mapping(address => mapping(uint256 => bool))
        public tokenFromCollectionIsOnSales;

    struct Order {
        address collectionAddress;
        address payable owner;
        uint256 tokenId;
        uint256 numberOfCopies;
        uint256 price;
        address currency;
        OrderStatus status;
    }

    struct Purchase {
        uint256 orderId;
        address buyer;
        address collectionAddress;
        uint256 tokenId;
        uint256 numberOfCopies;
        uint256 price;
        address currency;
        uint256 marketFee;
        uint256 royaltyFee;
        uint256 timeOfPurchase;
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

    event NFTBought(Purchase purchase);

    event NFTCancelSales(uint256 orderId);

    function initialize(address _hub) public initializer {
        __UUPSUpgradeable_init();
        __Pausable_init();

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);

        contractHub = _hub;
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

        // Token from collection must not be on another sales order
        require(
            tokenFromCollectionIsOnSales[collectionAddress][tokenId] == false,
            "Token is already put on sales"
        );

        //TODO: Extend support to other NFT standards. Only ERC-721 is supported at the moment.
        require(
            DefiForYouNFT(collectionAddress).ownerOf(tokenId) == msg.sender,
            "Not token owner"
        );
        require(
            DefiForYouNFT(collectionAddress).isApprovedForAll(
                msg.sender,
                address(this)
            ),
            "Spender is not approved"
        );
        require(price > 0, "Invalid price");

        uint256 orderId = _orderIdCounter.current();

        Order storage _order = orders[orderId];
        _order.owner = payable(msg.sender);
        _order.tokenId = tokenId;
        _order.collectionAddress = collectionAddress;
        _order.currency = currency;
        _order.price = price;
        _order.status = OrderStatus.ON_SALES;
        // TODO: Check against NFT standards for valid number of copies from function input
        _order.numberOfCopies = numberOfCopies;

        tokenFromCollectionIsOnSales[_order.collectionAddress][
            _order.tokenId
        ] = true;

        _orderIdCounter.increment();

        (uint256 ZOOM, uint256 marketFeeRate, ) = HubInterface(contractHub)
            .getNFTMarketConfig();

        // Calculate market fee
        uint256 marketFee = CommonLib.calculateSystemFee(
            _order.price,
            marketFeeRate,
            ZOOM
        );

        emit NFTPutOnSales(orderId, _order, marketFee, _order.status);
    }

    function cancelListing(uint256 orderId) external whenContractNotPaused {
        Order storage _order = orders[orderId];

        require(msg.sender == _order.owner, "Order's seller is required");

        // Delete token on sales flag
        tokenFromCollectionIsOnSales[_order.collectionAddress][
            _order.tokenId
        ] = false;

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
            _order.owner
        );

        require(msg.sender != _order.owner, "Buying owned NFT");

        (
            uint256 ZOOM,
            uint256 marketFeeRate,
            address marketFeeWallet
        ) = HubInterface(contractHub).getNFTMarketConfig();

        (
            uint256 _marketFee,
            uint256 _royaltyFee,
            uint256 _totalPaidAmount
        ) = _calculateOrderFees(
                _order,
                numberOfCopies,
                ZOOM,
                marketFeeRate,
                _standard
            );

        // Transfer fund to contract
        CommonLib.safeTransfer(
            _order.currency,
            msg.sender,
            address(this),
            _totalPaidAmount
        );

        // Calculate total fee charged
        uint256 _totalFeeCharged = _marketFee + _royaltyFee;

        (bool success, uint256 amountPaidToSeller) = _order.price.trySub(
            _totalFeeCharged
        );
        require(success);

        // Transfer market fee to fee wallet
        CommonLib.safeTransfer(
            _order.currency,
            address(this),
            marketFeeWallet,
            _marketFee
        );

        if (_royaltyFee > 0) {
            // Transfer royalty fee to original creator of the collection
            CommonLib.safeTransfer(
                _order.currency,
                address(this),
                DefiForYouNFT(_order.collectionAddress).originalCreator(),
                _royaltyFee
            );
        }

        // Transfer remaining amount to seller after deducting market fee and royalty fee
        CommonLib.safeTransfer(
            _order.currency,
            address(this),
            _order.owner,
            amountPaidToSeller
        );

        // Transfer NFT to buyer
        // TODO: Extend support to ERC-1155
        DefiForYouNFT(_order.collectionAddress).safeTransferFrom(
            _order.owner,
            msg.sender,
            _order.tokenId
        );

        // If number of copies being purchased equal to listed number of copies,
        // mark the order as completed and set tokenFromCollectionIsOnSales flag to false
        if (numberOfCopies == _order.numberOfCopies) {
            _order.status = OrderStatus.COMPLETED;
            tokenFromCollectionIsOnSales[_order.collectionAddress][
                _order.tokenId
            ] = false;
        }

        Purchase memory _purchase = Purchase(
            orderId,
            msg.sender,
            _order.collectionAddress,
            _order.tokenId,
            numberOfCopies,
            amountPaidToSeller,
            _order.currency,
            _marketFee,
            _royaltyFee,
            block.timestamp,
            _order.status
        );

        emit NFTBought(_purchase);
    }

    function _calculateOrderFees(
        Order memory order,
        uint256 numberOfCopiesPurchased,
        uint256 zoom,
        uint256 marketFeeRate,
        CollectionStandard standard
    )
        internal
        view
        returns (
            uint256 marketFee,
            uint256 royaltyFee,
            uint256 totalPaidAmount
        )
    {
        // Buying ERC-721 token, single copy only
        totalPaidAmount = order.price;

        // By default, the token owner is the original creator of the collection -> Royalty fee = 0;
        royaltyFee = 0;

        // Calculate market fee
        marketFee = CommonLib.calculateSystemFee(
            order.price,
            marketFeeRate,
            zoom
        );

        // If token owner is not the original creator of collection
        if (
            order.owner !=
            DefiForYouNFT(order.collectionAddress).originalCreator()
        ) {
            // Calculate royalty fee
            royaltyFee = CommonLib.calculateSystemFee(
                order.price,
                DefiForYouNFT(order.collectionAddress).royaltyRateByToken(
                    order.tokenId
                ),
                zoom
            );
        }

        if (standard == CollectionStandard.ERC1155) {
            // Multiply all fees and amount by number of copies being purchased
            totalPaidAmount *= numberOfCopiesPurchased;
            marketFee *= numberOfCopiesPurchased;
            royaltyFee != 0
                ? royaltyFee *= numberOfCopiesPurchased
                : royaltyFee;
        }
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
