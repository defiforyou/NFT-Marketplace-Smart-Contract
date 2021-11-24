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

// import "hardhat/console.sol";

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
    mapping(uint256 => Auction) public auctions;

    // mapping(address => mapping(uint256 => bool))
    //     public tokenFromCollectionIsOnSalesOrAuction;
    struct Auction {
        address owner;
        uint256 tokenId;
        address collectionAddress;
        uint256 startingPrice;
        uint256 buyOutPrice;
        uint256 priceStep;
        uint256 bidValue;
        address winner;
        address currency;
        uint256 startTime;
        uint256 endTime;
        AuctionStatus status;
    }

    enum AuctionStatus {
        PENDING,
        APPROVED,
        REJECTED,
        FINISHED,
        CANCELLED
    }

    event NFTAuctionCreated(uint256 auctionId, Auction auction);

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
        // require(
        //     tokenFromCollectionIsOnSalesOrAuction[collectionAddress][tokenId] ==
        //         false,
        //     "already put on sales or auction"
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
        require(buyOutPrice > 0, "buyOutPrice");
        require(priceStep > 0, "priceStep");
        require(startTime > block.timestamp + 2 days, "startTime");
        require(
            endTime <= (startTime + 5 days) && endTime > (startTime + 12 hours),
            "endTime"
        );

        uint256 auctionId = _auctionIdCounter.current();

        Auction storage _auction = auctions[auctionId];
        _auction.tokenId = tokenId;
        _auction.collectionAddress = collectionAddress;
        _auction.owner = msg.sender;
        _auction.startingPrice = startingPrice;
        _auction.buyOutPrice = buyOutPrice;
        _auction.priceStep = priceStep;
        _auction.bidValue = 0;
        _auction.winner = address(0);
        _auction.currency = currency;
        _auction.startTime = startTime;
        _auction.endTime = endTime;
        _auction.status = AuctionStatus.PENDING;

        _auctionIdCounter.increment();

        // lock nft of msg.sender in to contract
        DefiForYouNFT(collectionAddress).safeTransferFrom(
            msg.sender,
            address(this),
            tokenId
        );

        // calculate market fee based on buyOutPrice
        // (uint256 _zoom, uint256 _marketFeeRate, ) = HubInterface(contractHub)
        //     .getNFTMarketConfig();

        // uint256 marketFee = CommonLib.calculateSystemFee(
        //     _auction.buyOutPrice,
        //     _marketFeeRate,
        //     _zoom
        // );

        emit NFTAuctionCreated(auctionId, _auction);
    }

    // có 2 luồng tính market fee -> 1 tính theo giá bid -> tính theo giá buyout
    // các trường hợp xảy ra : bid lần lượt cho tới end auction
    // luồng auction

    // luồng buy out
    // bid với giá buyOut
    // bidder chọn buyOut

    function approveAuction(uint256 auctionId, AuctionStatus status)
        external
        whenContractNotPaused
        onlyRole(OPERATOR_ROLE)
    {
        Auction storage _auction = auctions[auctionId];
        require(
            status == AuctionStatus.APPROVED ||
                status == AuctionStatus.REJECTED,
            "approve or rejected"
        );
        // require(
        //     tokenFromCollectionIsOnSalesOrAuction[_auction.collectionAddress][
        //         _auction.tokenId
        //     ] == false,
        //     "already put on sales or auction"
        // );

        if (status == AuctionStatus.REJECTED) {
            DefiForYouNFT(_auction.collectionAddress).safeTransferFrom(
                address(this),
                _auction.owner,
                _auction.tokenId
            );
            _auction.status = AuctionStatus.REJECTED;
            delete auctions[auctionId];
        } else {
            _auction.status = AuctionStatus.APPROVED;
            // tokenFromCollectionIsOnSalesOrAuction[_auction.collectionAddress][
            //     _auction.tokenId
            // ] = true;
        }

        emit NFTAuctionApprovalStatus(auctionId, _auction.status);
    }

    function buyOut(uint256 auctionId) external payable whenContractNotPaused {
        Auction storage _auction = auctions[auctionId];
        require(_auction.status == AuctionStatus.APPROVED, "yet approved");
        require(msg.sender != _auction.owner, "Buying owned NFT");
        require(block.timestamp < _auction.endTime, "auction is ended");
        // call buyOut internal function
        _buyOut(auctionId);
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

    function _buyOut(uint256 auctionId) internal whenContractNotPaused {
        Auction storage auction = auctions[auctionId];

        (
            uint256 zoom,
            uint256 marketFeeRate,
            address marketFeeWallet
        ) = HubInterface(contractHub).getNFTMarketConfig();

        (uint256 _marketFee, uint256 _royaltyFee) = _calculateAuctionFees(
            auction.buyOutPrice,
            zoom,
            marketFeeRate,
            auction.tokenId,
            auction.owner,
            auction.collectionAddress
        );

        // Transfer fund to contract
        CommonLib.safeTransfer(
            auction.currency,
            msg.sender,
            address(this),
            auction.buyOutPrice
        );
        // todo : calculate based on buyOutPrice
        // calculate total fee charged
        uint256 _totalFeeCharged = _marketFee + _royaltyFee;
        (bool success, uint256 amountPaidToSeller) = auction.buyOutPrice.trySub(
            _totalFeeCharged
        );

        require(success);

        // Transfer market fee to fee wallet
        CommonLib.safeTransfer(
            auction.currency,
            address(this),
            marketFeeWallet,
            _marketFee
        );

        if (_royaltyFee > 0) {
            // Transfer royalty fee to original creator of the collection
            CommonLib.safeTransfer(
                auction.currency,
                address(this),
                DefiForYouNFT(auction.collectionAddress).originalCreator(),
                _royaltyFee
            );
        }
        // Transfer remaining amount to seller after deducting market fee and royalty fee
        CommonLib.safeTransfer(
            auction.currency,
            address(this),
            auction.owner,
            amountPaidToSeller
        );

        // Transfer NFT to buyer
        DefiForYouNFT(auction.collectionAddress).safeTransferFrom(
            address(this),
            msg.sender,
            auction.tokenId
        );

        auction.status = AuctionStatus.FINISHED;

        // tokenFromCollectionIsOnSalesOrAuction[auction.collectionAddress][
        //     auction.tokenId
        // ] = false;

        emit NFTAuctionBoughtOut(
            auctionId,
            msg.sender,
            auction.bidValue,
            block.timestamp,
            auction.status
        );
    }

    function bid(uint256 auctionId, uint256 bidValue)
        external
        payable
        whenContractNotPaused
    {
        Auction storage _auction = auctions[auctionId];

        require(_auction.status == AuctionStatus.APPROVED, "yet approved");

        require(block.timestamp > _auction.startTime, "yet start");

        require(block.timestamp < _auction.endTime, "ended");

        require(msg.sender != _auction.owner, "bid owned NFT");

        if (_auction.winner == address(0)) {
            require(bidValue >= _auction.startingPrice, "bid value");
        }

        // calculator priceStep
        require(
            bidValue >= (_auction.bidValue + _auction.priceStep),
            "higher bid required"
        );

        uint256 previousBidValue;

        if (bidValue >= _auction.buyOutPrice) {
            _buyOut(auctionId);
        } else {
            // Transfer fund to contract
            CommonLib.safeTransfer(
                _auction.currency,
                msg.sender,
                address(this),
                bidValue
            );
        }

        if (_auction.winner != address(0)) {
            // refund for previous bidder
            previousBidValue = _auction.bidValue;
            CommonLib.safeTransfer(
                _auction.currency,
                address(this),
                _auction.winner,
                _auction.bidValue
            );
        }
        _auction.bidValue = bidValue;
        _auction.winner = msg.sender;

        emit NFTAuctionBidded(
            auctionId,
            msg.sender,
            _auction.tokenId,
            _auction.collectionAddress,
            _auction.bidValue,
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
        Auction storage _auction = auctions[auctionId];
        require(block.timestamp > _auction.endTime, "over yet");

        (
            uint256 zoom,
            uint256 marketFeeRate,
            address marketFeeWallet
        ) = HubInterface(contractHub).getNFTMarketConfig();

        (uint256 _marketFee, uint256 _royaltyFee) = _calculateAuctionFees(
            _auction.bidValue,
            zoom,
            marketFeeRate,
            _auction.tokenId,
            _auction.owner,
            _auction.collectionAddress
        );

        uint256 _totalFeeCharged = _marketFee + _royaltyFee;
        (bool success, uint256 amountPaidToSeller) = _auction.bidValue.trySub(
            _totalFeeCharged
        );
        require(success);

        if (_auction.winner != address(0)) {
            // Transfer market fee to fee wallet
            CommonLib.safeTransfer(
                _auction.currency,
                address(this),
                marketFeeWallet,
                _marketFee
            );
            if (_royaltyFee > 0) {
                // Transfer royalty fee to original creator of the collection
                CommonLib.safeTransfer(
                    _auction.currency,
                    address(this),
                    DefiForYouNFT(_auction.collectionAddress).originalCreator(),
                    _royaltyFee
                );

                // Transfer remaining amount to seller after deducting market fee and royalty fee
                CommonLib.safeTransfer(
                    _auction.currency,
                    address(this),
                    _auction.owner,
                    amountPaidToSeller
                );
            }
            // Transfer NFT to buyer
            DefiForYouNFT(_auction.collectionAddress).safeTransferFrom(
                address(this),
                _auction.winner,
                _auction.tokenId
            );
        } else {
            // pay nft back to seller
            DefiForYouNFT(_auction.collectionAddress).safeTransferFrom(
                address(this),
                _auction.owner,
                _auction.tokenId
            );
        }

        _auction.status = AuctionStatus.FINISHED;

        // when auction is end -> reset status of tokenFromCollectionIsOnSalesOrAuction to next owner can put on sale or auction
        // tokenFromCollectionIsOnSalesOrAuction[_auction.collectionAddress][
        //     _auction.tokenId
        // ] = false;

        emit NFTAuctionFinished(
            auctionId,
            _auction.winner,
            _auction.bidValue,
            block.timestamp,
            _auction.status
        );
    }

    function cancelAuction(uint256 auctionId) external whenContractNotPaused {
        Auction storage _auction = auctions[auctionId];
        require(msg.sender == _auction.owner, "seller");
        require(block.timestamp < _auction.startTime, "can't cancel");
        // pay nft back to seller
        DefiForYouNFT(_auction.collectionAddress).safeTransferFrom(
            address(this),
            _auction.owner,
            _auction.tokenId
        );
        // delete auction from auction list
        delete auctions[auctionId];
        _auction.status = AuctionStatus.CANCELLED;
        emit NFTAuctionCancelled(auctionId, _auction.status);
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
