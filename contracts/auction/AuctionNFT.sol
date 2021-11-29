// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "../base/BaseContract.sol";
import "../libs/CommonLib.sol";
import "../dfy-nft/DefiForYouNFT.sol";
import "../market/ISellNFT.sol";
import "./IAuctionNFT.sol";

contract AuctionNFT is
    Initializable,
    UUPSUpgradeable,
    ERC721HolderUpgradeable,
    PausableUpgradeable,
    BaseContract,
    IAuctionNFT
{
    using SafeMathUpgradeable for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter private _auctionIdCounter;
    mapping(uint256 => AuctionSession) public auctions;

    function initialize(address _hub) public initializer {
        __UUPSUpgradeable_init();
        __Pausable_init();

        __BaseContract_init(_hub);
    }

    /** ==================== Standard interface function implementations ==================== */

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC165Upgradeable, IERC165Upgradeable)
        returns (bool)
    {
        return
            interfaceId == type(IAuctionNFT).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function signature() external pure override returns (bytes4) {
        return type(IAuctionNFT).interfaceId;
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
    ) external override whenContractNotPaused {
        // Check if the token is already put on sales on Market (SellNFT)
        require(!_isTokenOnSales(tokenId, collectionAddress), "Token has been put on sales");

        require(
            DefiForYouNFT(collectionAddress).ownerOf(tokenId) == _msgSender(),
            "Not token owner"
        );
        require(
            DefiForYouNFT(collectionAddress).isApprovedForAll(
                _msgSender(),
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
        _auctionSession.auctionData.owner = _msgSender();
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

        // lock nft of _msgSender() in to contract
        DefiForYouNFT(collectionAddress).safeTransferFrom(
            _msgSender(),
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
        override
        whenContractNotPaused
        onlyOperator
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

    function buyOut(uint256 auctionId) external payable override whenContractNotPaused {
        AuctionSession storage _auctionSession = auctions[auctionId];
        require(
            _auctionSession.status == AuctionStatus.APPROVED,
            "yet approved"
        );
        require(
            _msgSender() != _auctionSession.auctionData.owner,
            "Buying owned NFT"
        );
        require(
            block.timestamp < _auctionSession.auctionData.endTime,
            "auctionSession is ended"
        );
        // call buyOut internal function
        _buyOut(auctionId, _auctionSession);
    }

    function _buyOut(uint256 auctionId, AuctionSession storage auctionSession) internal whenContractNotPaused {
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
            _msgSender(),
            address(this),
            auctionSession.auctionData.buyOutPrice
        );
        
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
                _msgSender(),
                auctionSession.auctionData.tokenId
            );

        auctionSession.status = AuctionStatus.FINISHED;

        emit NFTAuctionBoughtOut(
            auctionId,
            _msgSender(),
            auctionSession.bidValue,
            block.timestamp,
            auctionSession.status
        );
    }

    function bid(uint256 auctionId, uint256 bidValue)
        external
        payable
        override
        whenContractNotPaused
    {
        AuctionSession storage _auctionSession = auctions[auctionId];

        require(
            _auctionSession.status == AuctionStatus.APPROVED,
            "Check auction approval"
        );

        require(
            block.timestamp > _auctionSession.auctionData.startTime,
            "Not started"
        );

        require(block.timestamp < _auctionSession.auctionData.endTime, "Ended");

        require(
            _msgSender() != _auctionSession.auctionData.owner,
            "Bidding owned NFT"
        );

        if (_auctionSession.winner == address(0)) {
            // For first bidder, bid value can be equal or higher than starting price
            require(
                bidValue >= _auctionSession.auctionData.startingPrice,
                "Bid value"
            );
        }

        // Bid using BNB => Check msg.value == bidValue
        if(_auctionSession.auctionData.currency == address(0)) {
            require(msg.value == bidValue, "Insufficient BNB");
        }

        // calculate priceStep
        if (_auctionSession.auctionData.priceStep > 0) {
            require(
                bidValue >=
                    (_auctionSession.bidValue +
                        _auctionSession.auctionData.priceStep),
                "Higher bid required"
            );
        } else {
            require(bidValue > _auctionSession.bidValue, "Higher bid required");
        }

        uint256 previousBidValue;

        if (
            _auctionSession.auctionData.buyOutPrice > 0 &&
            bidValue >= _auctionSession.auctionData.buyOutPrice
        ) {
            _buyOut(auctionId, _auctionSession);
        } else {
            // Transfer fund to contract
            CommonLib.safeTransfer(
                _auctionSession.auctionData.currency,
                _msgSender(),
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
        _auctionSession.winner = _msgSender();

        emit NFTAuctionBidded(
            auctionId,
            _msgSender(),
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
        override
        whenContractNotPaused
        onlyOperator
    {
        AuctionSession storage _auctionSession = auctions[auctionId];
        require(
            block.timestamp > _auctionSession.auctionData.endTime,
            "end time not reached"
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
            }
            // Transfer remaining amount to seller after deducting market fee and royalty fee
            CommonLib.safeTransfer(
                _auctionSession.auctionData.currency,
                address(this),
                _auctionSession.auctionData.owner,
                amountPaidToSeller
            );
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

    function cancelAuction(uint256 auctionId) external override whenContractNotPaused {
        AuctionSession storage _auctionSession = auctions[auctionId];
        require(
            _auctionSession.status == AuctionStatus.PENDING,
            "auction has been approved or finished"
        );
        require(_msgSender() == _auctionSession.auctionData.owner, "seller");
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

    function _isTokenOnSales(uint256 tokenId, address collectionAddress) internal view returns (bool isOnSales) {
        // Query SellNFT contract address from Hub
        address nftSales = HubInterface(contractHub).getContractAddress(type(ISellNFT).interfaceId);

        require(nftSales != address(0), "Invalid NFT Sales address");

        // Query token's sales status
        isOnSales = ISellNFT(nftSales).isTokenOnSales(tokenId, collectionAddress);
    }
}
