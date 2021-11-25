// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "./dfy-nft/DefiForYouNFT.sol";
import "./libs/CommonLib.sol";

contract AuctionNFT is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ERC721HolderUpgradeable,
    PausableUpgradeable
{
    using SafeMathUpgradeable for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // uint256 public marketFeeRate;
    // address public marketFeeWallet;
    // uint256 public ZOOM;

    address public contractHub;

    CountersUpgradeable.Counter private _auctionIdCounter;
    mapping(uint256 => AuctionSession) public auctions;

    struct AuctionSession {
        AuctionData auctionData;
        uint256 bidValue;
        address winner;
        AuctionStatus status;
    }

    struct AuctionData {
        address owner;
        uint256 tokenId;
        address collectionAddress;
        uint256 startingPrice;
        uint256 buyOutPrice;
        uint256 priceStep;
        address currency;
        uint256 startTime;
        uint256 endTime;
    }

    enum AuctionStatus {
        PENDING,
        APPROVED,
        REJECTED,
        FINISHED,
        CANCELLED
    }

    event NFTAuctionCreated(
        uint256 auctionId,
        AuctionData auctionData,
        AuctionStatus auctionStatus
    );

    event NFTAuctionFinished(
        uint256 auctionId,
        address winner,
        uint256 bidValue,
        uint256 timeOfBidding,
        AuctionStatus auctionStatus
    );

    event NFTAuctionBoughtOut(
        uint256 auctionId,
        address buyer,
        uint256 boughtOutValue,
        uint256 timeOfPurchase,
        AuctionStatus auctionStatus
    );

    event NFTAuctionBidded(
        uint256 auctionId,
        address bidder,
        uint256 tokenId,
        address collectionAddress,
        uint256 bidValue,
        uint256 previousBidValue,
        uint256 timeOfBidding
    );

    event NFTAuctionApprovalStatus(
        uint256 auctionId,
        AuctionStatus auctionStatus
    );

    event NFTAuctionCancelled(uint256 auctionId, AuctionStatus auctionStatus);

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

    function putOnAuction(
        uint256 tokenId,
        address collectionAddress,
        uint256 startingPrice,
        uint256 buyOutPrice,
        uint256 priceStep,
        address currency,
        uint256 startTime,
        uint256 endTime
    ) external whenContractNotPaused {
        // TODO: Check if the token is already put on sales on Market (SellNFT)
        // require(
        //     tokenFromCollectionIsOnSalesOrAuction[collectionAddress][tokenId] ==
        //         false,
        //     "already put on sales or auctionSession"
        // );

        require(
            DefiForYouNFT(collectionAddress).ownerOf(tokenId) == msg.sender,
            "Not token owner"
        );
        require(
            DefiForYouNFT(collectionAddress).isApprovedForAll(
                msg.sender,
                address(this)
            ) == true,
            "Spender is not approved"
        );
        require(startingPrice > 0, "startingPrice");

        require(
            startTime >=
                (block.timestamp +
                    CommonLib.getSecondsOfDuration(DurationType.DAY, 2)),
            "startTime"
        );
        require(
            endTime <=
                (startTime +
                    CommonLib.getSecondsOfDuration(DurationType.DAY, 5)),
            "endTime > 7 days"
        );
        require(
            endTime >=
                (startTime +
                    CommonLib.getSecondsOfDuration(DurationType.HOUR, 12)),
            "endTime > 12 hours"
        );

        uint256 auctionId = _auctionIdCounter.current();

        AuctionSession storage _auctionSession = auctions[auctionId];
        _auctionSession.auctionData.tokenId = tokenId;
        _auctionSession.auctionData.collectionAddress = collectionAddress;
        _auctionSession.auctionData.owner = msg.sender;
        _auctionSession.auctionData.startingPrice = startingPrice;
        _auctionSession.auctionData.buyOutPrice = buyOutPrice;
        _auctionSession.auctionData.priceStep = priceStep;
        _auctionSession.auctionData.currency = currency;
        _auctionSession.auctionData.startTime = startTime;
        _auctionSession.auctionData.endTime = endTime;
        _auctionSession.bidValue = 0;
        _auctionSession.winner = address(0);
        _auctionSession.status = AuctionStatus.PENDING;

        _auctionIdCounter.increment();

        // lock nft of msg.sender in to contract
        DefiForYouNFT(collectionAddress).safeTransferFrom(
            msg.sender,
            address(this),
            tokenId
        );

        emit NFTAuctionCreated(
            auctionId,
            _auctionSession.auctionData,
            _auctionSession.status
        );
    }

    function approveAuction(uint256 auctionId, AuctionStatus status)
        external
        whenContractNotPaused
        onlyRole(OPERATOR_ROLE)
    {
        AuctionSession storage _auctionSession = auctions[auctionId];
        require(
            status == AuctionStatus.APPROVED ||
                status == AuctionStatus.REJECTED,
            "approve or rejected"
        );

        require(
            _auctionSession.status == AuctionStatus.PENDING,
            "auction pending required"
        );

        if (status == AuctionStatus.REJECTED) {
            // Refund token to auction owner
            DefiForYouNFT(_auctionSession.auctionData.collectionAddress)
                .safeTransferFrom(
                    address(this),
                    _auctionSession.auctionData.owner,
                    _auctionSession.auctionData.tokenId
                );
            _auctionSession.status = AuctionStatus.REJECTED;
        } else {
            _auctionSession.status = AuctionStatus.APPROVED;
        }

        emit NFTAuctionApprovalStatus(auctionId, _auctionSession.status);
    }

    function buyOut(uint256 auctionId) external payable whenContractNotPaused {
        AuctionSession storage _auctionSession = auctions[auctionId];
        require(
            _auctionSession.status == AuctionStatus.APPROVED,
            "yet approved"
        );
        require(
            msg.sender != _auctionSession.auctionData.owner,
            "Buying owned NFT"
        );
        require(
            block.timestamp < _auctionSession.auctionData.endTime,
            "auctionSession is ended"
        );
        // call buyOut internal function
        _buyOut(auctionId);
    }

    function _buyOut(uint256 auctionId) internal whenContractNotPaused {
        AuctionSession storage auctionSession = auctions[auctionId];

        (
            uint256 zoom,
            uint256 marketFeeRate,
            address marketFeeWallet
        ) = HubInterface(contractHub).getNFTMarketConfig();

        (uint256 _marketFee, uint256 _royaltyFee) = _calculateAuctionFees(
            auctionSession.auctionData.buyOutPrice,
            zoom,
            marketFeeRate,
            auctionSession.auctionData.tokenId,
            auctionSession.auctionData.owner,
            auctionSession.auctionData.collectionAddress
        );

        // Transfer fund to contract
        CommonLib.safeTransfer(
            auctionSession.auctionData.currency,
            msg.sender,
            address(this),
            auctionSession.auctionData.buyOutPrice
        );
        // todo : calculate based on buyOutPrice
        // calculate total fee charged
        uint256 _totalFeeCharged = _marketFee + _royaltyFee;
        (bool success, uint256 amountPaidToSeller) = auctionSession
            .auctionData
            .buyOutPrice
            .trySub(_totalFeeCharged);

        require(success);

        // Transfer market fee to fee wallet
        CommonLib.safeTransfer(
            auctionSession.auctionData.currency,
            address(this),
            marketFeeWallet,
            _marketFee
        );

        if (_royaltyFee > 0) {
            // Transfer royalty fee to original creator of the collection
            CommonLib.safeTransfer(
                auctionSession.auctionData.currency,
                address(this),
                DefiForYouNFT(auctionSession.auctionData.collectionAddress)
                    .originalCreator(),
                _royaltyFee
            );
        }
        // Transfer remaining amount to seller after deducting market fee and royalty fee
        CommonLib.safeTransfer(
            auctionSession.auctionData.currency,
            address(this),
            auctionSession.auctionData.owner,
            amountPaidToSeller
        );

        // Transfer NFT to buyer
        DefiForYouNFT(auctionSession.auctionData.collectionAddress)
            .safeTransferFrom(
                address(this),
                msg.sender,
                auctionSession.auctionData.tokenId
            );

        auctionSession.status = AuctionStatus.FINISHED;

        emit NFTAuctionBoughtOut(
            auctionId,
            msg.sender,
            auctionSession.bidValue,
            block.timestamp,
            auctionSession.status
        );
    }

    function bid(uint256 auctionId, uint256 bidValue)
        external
        payable
        whenContractNotPaused
    {
        AuctionSession storage _auctionSession = auctions[auctionId];

        require(
            _auctionSession.status == AuctionStatus.APPROVED,
            "yet approved"
        );

        require(
            block.timestamp > _auctionSession.auctionData.startTime,
            "yet start"
        );

        require(block.timestamp < _auctionSession.auctionData.endTime, "ended");

        require(
            msg.sender != _auctionSession.auctionData.owner,
            "bid owned NFT"
        );

        if (_auctionSession.winner == address(0)) {
            require(
                bidValue >= _auctionSession.auctionData.startingPrice,
                "bid value"
            );
        }

        // calculator priceStep
        if (_auctionSession.auctionData.priceStep > 0) {
            require(
                bidValue >=
                    (_auctionSession.bidValue +
                        _auctionSession.auctionData.priceStep),
                "higher bid required"
            );
        } else {
            require(bidValue > _auctionSession.bidValue, "higher bid required");
        }

        uint256 previousBidValue;

        if (
            _auctionSession.auctionData.buyOutPrice > 0 &&
            bidValue >= _auctionSession.auctionData.buyOutPrice
        ) {
            _buyOut(auctionId);
        } else {
            // Transfer fund to contract
            CommonLib.safeTransfer(
                _auctionSession.auctionData.currency,
                msg.sender,
                address(this),
                bidValue
            );
        }

        if (_auctionSession.winner != address(0)) {
            // refund for previous bidder
            previousBidValue = _auctionSession.bidValue;
            CommonLib.safeTransfer(
                _auctionSession.auctionData.currency,
                address(this),
                _auctionSession.winner,
                _auctionSession.bidValue
            );
        }
        _auctionSession.bidValue = bidValue;
        _auctionSession.winner = msg.sender;

        emit NFTAuctionBidded(
            auctionId,
            msg.sender,
            _auctionSession.auctionData.tokenId,
            _auctionSession.auctionData.collectionAddress,
            _auctionSession.bidValue,
            previousBidValue,
            block.timestamp
        );
    }

    function finishAuction(uint256 auctionId)
        external
        payable
        whenContractNotPaused
        onlyRole(OPERATOR_ROLE)
    {
        AuctionSession storage _auctionSession = auctions[auctionId];
        require(
            block.timestamp > _auctionSession.auctionData.endTime,
            "over yet"
        );

        (
            uint256 zoom,
            uint256 marketFeeRate,
            address marketFeeWallet
        ) = HubInterface(contractHub).getNFTMarketConfig();

        (uint256 _marketFee, uint256 _royaltyFee) = _calculateAuctionFees(
            _auctionSession.bidValue,
            zoom,
            marketFeeRate,
            _auctionSession.auctionData.tokenId,
            _auctionSession.auctionData.owner,
            _auctionSession.auctionData.collectionAddress
        );

        uint256 _totalFeeCharged = _marketFee + _royaltyFee;
        (bool success, uint256 amountPaidToSeller) = _auctionSession
            .bidValue
            .trySub(_totalFeeCharged);
        require(success);

        if (_auctionSession.winner != address(0)) {
            // Transfer market fee to fee wallet
            CommonLib.safeTransfer(
                _auctionSession.auctionData.currency,
                address(this),
                marketFeeWallet,
                _marketFee
            );
            if (_royaltyFee > 0) {
                // Transfer royalty fee to original creator of the collection
                CommonLib.safeTransfer(
                    _auctionSession.auctionData.currency,
                    address(this),
                    DefiForYouNFT(_auctionSession.auctionData.collectionAddress)
                        .originalCreator(),
                    _royaltyFee
                );

                // Transfer remaining amount to seller after deducting market fee and royalty fee
                CommonLib.safeTransfer(
                    _auctionSession.auctionData.currency,
                    address(this),
                    _auctionSession.auctionData.owner,
                    amountPaidToSeller
                );
            }
            // Transfer NFT to buyer
            DefiForYouNFT(_auctionSession.auctionData.collectionAddress)
                .safeTransferFrom(
                    address(this),
                    _auctionSession.winner,
                    _auctionSession.auctionData.tokenId
                );
        } else {
            // pay nft back to seller
            DefiForYouNFT(_auctionSession.auctionData.collectionAddress)
                .safeTransferFrom(
                    address(this),
                    _auctionSession.auctionData.owner,
                    _auctionSession.auctionData.tokenId
                );
        }

        _auctionSession.status = AuctionStatus.FINISHED;

        // when auctionSession is end -> reset status of tokenFromCollectionIsOnSalesOrAuction to next owner can put on sale or auctionSession
        // tokenFromCollectionIsOnSalesOrAuction[_auctionSession.collectionAddress][
        //     _auctionSession.tokenId
        // ] = false;

        emit NFTAuctionFinished(
            auctionId,
            _auctionSession.winner,
            _auctionSession.bidValue,
            block.timestamp,
            _auctionSession.status
        );
    }

    function cancelAuction(uint256 auctionId) external whenContractNotPaused {
        AuctionSession storage _auctionSession = auctions[auctionId];
        require(
            _auctionSession.status == AuctionStatus.PENDING,
            "auction has been approved or finished"
        );
        require(msg.sender == _auctionSession.auctionData.owner, "seller");
        // pay nft back to seller
        DefiForYouNFT(_auctionSession.auctionData.collectionAddress)
            .safeTransferFrom(
                address(this),
                _auctionSession.auctionData.owner,
                _auctionSession.auctionData.tokenId
            );
        _auctionSession.status = AuctionStatus.CANCELLED;
        emit NFTAuctionCancelled(auctionId, _auctionSession.status);
    }

    function _calculateAuctionFees(
        uint256 amount,
        uint256 zoom,
        uint256 marketFeeRate,
        uint256 tokenId,
        address tokenOwner,
        address collectionAddress
    ) internal view returns (uint256 marketFee, uint256 royaltyFee) {
        // By default, the token owner is the original creator of the collection -> Royalty fee = 0;
        royaltyFee = 0;

        // calculate market fee base currentbid value
        marketFee = CommonLib.calculateSystemFee(amount, marketFeeRate, zoom);

        // todo : calculate fee based on bidvalue or buyout price

        if (
            tokenOwner != DefiForYouNFT(collectionAddress).originalCreator()
        ) // owner nft not seller
        {
            // calculate royalty fee
            royaltyFee = CommonLib.calculateSystemFee(
                amount,
                DefiForYouNFT(collectionAddress).royaltyRateByToken(tokenId),
                zoom
            );
        }
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

    function setContractHub(address _hub)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        contractHub = _hub;
    }
}
