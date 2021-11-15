// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./DefiForYouNFT.sol";
import "./dfy-nft/DfyNFTLib.sol";

contract SellNFT is Ownable, ERC721Holder, Pausable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    IERC721 public assetNFT;
    using Counters for Counters.Counter;

    struct Orders {
        address payable seller;
        uint256 orderId;
        uint256 tokenId;
        address collectionAddress;
        address currency;
        address buyer;
        uint256 price;
        uint256 marketFee;
        uint256 royaltyFee;
        uint256 timeOfPurchase;
        uint256 numberOfCopies;
    }

    mapping(uint256 => Orders) public orderOf;
    Counters.Counter private _orderIdCounter;

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

    constructor() Ownable() {}

    function setFeeWallet(address _walletFeeMarket) public onlyOwner {
        walletFeeMarket = payable(_walletFeeMarket);
    }

    function setMarketFee(uint256 fee) public onlyOwner {
        marketFee = fee;
    }

    // nếu seller muốn thay đổi address collection và currency thì sẽ ntn ?
    function putOnSales(
        uint256 tokenId,
        uint256 price,
        address currency,
        address collectionAddress
    ) external {
        assetNFT = IERC721(collectionAddress);
        require(
            assetNFT.ownerOf(tokenId) == msg.sender,
            "seller not owner of tokenId"
        );
        require(
            assetNFT.getApproved(tokenId) == address(this),
            "tokenId is not approved"
        );
        require(price >= 0 && price != 0, "invalid price");

        uint256 orderId = _orderIdCounter.current();

        orderOf[orderId] = Orders({
            seller: payable(msg.sender),
            orderId: orderId,
            tokenId: tokenId,
            collectionAddress: collectionAddress,
            currency: currency,
            buyer: address(0),
            price: price,
            marketFee: marketFee,
            royaltyFee: DefiForYouNFT(collectionAddress).royaltyRateByToken(
                tokenId
            ),
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
            obj.marketFee,
            OrderStatus.ON_SALES
        );
    }

    function buyNFT(uint256 orderId) external payable {
        Orders storage obj = orderOf[orderId];

        // buyer transfer to contract
        DfyNFTLib.safeTransfer(
            obj.currency,
            msg.sender,
            address(this),
            obj.price
        );

        uint256 zoom = 1e5;
        uint256 royaltyFee = DfyNFTLib.calculateSystemFee(
            obj.price,
            obj.royaltyFee,
            zoom
        );

        marketFee = DfyNFTLib.calculateSystemFee(
            obj.price,
            obj.marketFee,
            zoom
        );

        uint256 remainMoney = obj.price.sub(marketFee); // remaining amount - số tiền còn lại sau khi trừ phí sàn
        uint256 afterN1 = obj.price.sub(marketFee).sub(royaltyFee); // số tiền còn lại sau khi trừ phí bản quyền

        // if có royalty fee
        if (
            obj.royaltyFee != 0 &&
            DefiForYouNFT(obj.collectionAddress).originalCreator() == obj.seller
        ) {
            // origin creator chỉ chịu - 2,5% phí sàn
            DfyNFTLib.safeTransfer(
                obj.currency,
                address(this),
                obj.seller,
                remainMoney
            ); // 87,5 % of NFT to seller
            DfyNFTLib.safeTransfer(
                obj.currency,
                address(this),
                walletFeeMarket,
                marketFee
            ); // 2,5 % of NFT to fee wallet
        } else {
            // if có royaltyFee và origin creater != seller
            if (
                obj.royaltyFee != 0 &&
                assetNFT.ownerOf(obj.tokenId) !=
                DefiForYouNFT(obj.collectionAddress).originalCreator()
            ) {
                DfyNFTLib.safeTransfer(
                    obj.currency,
                    address(this),
                    DefiForYouNFT(obj.collectionAddress).originalCreator(),
                    royaltyFee
                ); // transfer 10% royaltyFee to origin creator

                DfyNFTLib.safeTransfer(
                    obj.currency,
                    address(this),
                    walletFeeMarket,
                    marketFee
                ); // transfer 2,5 % of price NFT for FeeMarket

                DfyNFTLib.safeTransfer(
                    obj.currency,
                    address(this),
                    obj.seller,
                    afterN1
                ); // remain transfer to seller
            }
            // đối với token không có royaltyFee chỉ chịu 2,5 % phí sàn
            DfyNFTLib.safeTransfer(
                obj.currency,
                address(this),
                obj.seller,
                remainMoney
            ); // transfer to seller
            DfyNFTLib.safeTransfer(
                obj.currency,
                address(this),
                walletFeeMarket,
                marketFee
            ); // transfer to feeWallet
        }

        assetNFT.safeTransferFrom(address(this), msg.sender, obj.tokenId);
        obj.buyer = msg.sender; // làm thay đổi struct nên sử dụng storage

        emit NFTBought(
            orderId,
            obj.tokenId,
            obj.collectionAddress,
            obj.buyer,
            obj.price,
            obj.marketFee,
            obj.royaltyFee,
            obj.timeOfPurchase,
            OrderStatus.NFT_BOUGHT
        );
    }

    // function cancelListing(uint256 orderId) external {
    //     Orders memory obj = orderOf[orderId];
    // }
}
