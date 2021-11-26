// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "../base/BaseInterface.sol";

interface ISellNFT is BaseInterface {

    /** Datatypes */
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

    /** Enums */
    enum OrderStatus {
        ON_SALES,
        COMPLETED
    }

    enum CollectionStandard {
        UNDEFINED,
        ERC721,
        ERC1155
    }

    /** Events */
    event NFTPutOnSales(
        uint256 orderId,
        Order order,
        uint256 marketFee,
        OrderStatus orderStatus
    );

    event NFTBought(Purchase purchase);

    event NFTCancelSales(uint256 orderId);

    /** Functions */
    function putOnSales(
        uint256 tokenId,
        uint256 numberOfCopies,
        uint256 price,
        address currency,
        address collectionAddress
    ) external;
}