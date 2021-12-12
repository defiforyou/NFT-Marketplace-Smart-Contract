// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "../base/BaseInterface.sol";

interface IAuctionNFT is BaseInterface {
    /** Datatypes */
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

    /** Enums */
    enum AuctionStatus {
        PENDING,
        APPROVED,
        REJECTED,
        FINISHED,
        CANCELLED
    }

    /** Events */
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

    /** Functions */
    function putOnAuction(
        uint256 tokenId,
        address collectionAddress,
        uint256 startingPrice,
        uint256 buyOutPrice,
        uint256 priceStep,
        address currency,
        uint256 startTime,
        uint256 endTime
    ) external;

    function approveAuction(uint256 auctionId, AuctionStatus status) external;

    function cancelAuction(uint256 auctionId) external;

    function buyOut(uint256 auctionId) external payable;

    function bid(uint256 auctionId, uint256 bidValue) external payable;

    function finishAuction(uint256 auctionId) external payable;
}
