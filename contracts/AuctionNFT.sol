// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "./DefiForYouNFT.sol";
import "./dfy-nft/DfyNFTLib.sol";

// todo: commit auction sang branch khác mỗi sprint làm trên 1 branch

contract AuctionNFT is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ERC721HolderUpgradeable,
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

    CountersUpgradeable.Counter private _auctionIdCounter;
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => bool) public listAuctionApproved;

    struct Auction {
        uint256 tokenId;
        address collectionAddress;
        address owner;
        uint256 startingPrice;
        uint256 buyOutPrice;
        uint256 priceStep;
        uint256 currentBidPrice;
        address currentBidAddress;
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

    enum CollectionStandard {
        ERC721,
        ERC1155
    }

    event NFTAuctionCreated(
        uint256 auctionId,
        uint256 marketFeeAuction,
        uint256 marketFeeBuyOut,
        Auction auction,
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
        Auction auction,
        uint256 previousBidValue,
        uint256 timeOfBidding
    );

    event NFTAuctionApprovalStatus(
        uint256 auctionId,
        AuctionStatus auctionStatus
    );

    event NFTAuctionCancelled(uint256 auctionId, AuctionStatus auctionStatus);

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
        // todo : seller create auction , wait admin approve - if true transfer nft of seller into contract

        require(
            DefiForYouNFT(collectionAddress).ownerOf(tokenId) == msg.sender,
            "seller not owner of tokenId"
        );
        require(
            DefiForYouNFT(collectionAddress).isApprovedForAll(
                msg.sender,
                address(this)
            ) == true,
            "tokenId is not approved"
        );
        require(startingPrice > 0, "invalid startingPrice");
        require(buyOutPrice > 0, "invalid buyOutPrice");
        require(priceStep > 0, "invalid price step");

        // todo : duration tối thiểu là 12h
        // todo : startTime tối thiểu được bắt đầu sau 2 ngày tính từ block time của put on auction
        // todo : endTime maximum là 7 ngày
        require(startTime > block.timestamp + 2 days, "start time is < 2 days");
        require(endTime <= (startTime + 5 days), "end time is > 7 days");
        require(
            endTime > startTime + 12 hours,
            "end time is < start time + 12 hours"
        );

        uint256 auctionId = _auctionIdCounter.current();

        Auction storage _auction = auctions[auctionId];
        _auction.tokenId = tokenId;
        _auction.collectionAddress = collectionAddress;
        _auction.owner = msg.sender;
        _auction.startingPrice = startingPrice;
        _auction.buyOutPrice = buyOutPrice;
        _auction.priceStep = priceStep;
        _auction.currentBidPrice = 0;
        _auction.currentBidAddress = address(0);
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

        // todo : market fee based on currentBidPrice of auction
        uint256 marketFeeBuyOut = DfyNFTLib.calculateSystemFee(
            _auction.buyOutPrice,
            marketFeeRate,
            ZOOM
        );

        // _auction.status = AuctionStatus.PENDING;
        emit NFTAuctionCreated(
            auctionId,
            0,
            marketFeeBuyOut,
            _auction,
            _auction.status
        );
    }

    // question : approveAuction có hiệu lực ở blockchain hay BE , FE ?

    function approveAuction(uint256 auctionId, bool approve)
        external
        whenContractNotPaused
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        // todo : operator contract approve for auction or REJECTED auction
        listAuctionApproved[auctionId] = approve;
    }

    function bidNFT(uint256 auctionId, uint256 bidValue)
        external
        payable
        whenContractNotPaused
    {
        // todo : bidder bid value for nft - if have buyer buyOut nft stop auction
        Auction storage _auction = auctions[auctionId];

        require(block.timestamp > _auction.startTime, "auction is yet start");
        require(block.timestamp < _auction.endTime, "auction is ended");
        require(msg.sender != _auction.owner, "bid owned NFT");
        require(bidValue >= _auction.startingPrice, "invalid bid value");

        // Transfer fund to contract
        DfyNFTLib.safeTransfer(
            _auction.currency,
            msg.sender,
            address(this),
            bidValue
        );

        // calculator priceStep
        uint256 priceStep = _auction.currentBidPrice + _auction.priceStep;
        require(bidValue >= priceStep, "bidValue < priceStep");

        uint256 previousBidValue;

        // if > pricestep có 2 case : bidder bid với giá > step price nhưng < buyOut price
        // bidder bid >= stepPrice

        // bidder bidValue > buyOutPrice
        if (bidValue >= _auction.buyOutPrice) {
            DfyNFTLib.safeTransfer(
                _auction.currency,
                msg.sender,
                address(this),
                bidValue
            );
        } else {
            // refund for old bidder
            DfyNFTLib.safeTransfer(
                _auction.currency,
                address(this),
                _auction.collectionAddress,
                _auction.currentBidPrice
            );

            previousBidValue = _auction.currentBidPrice;
        }

        _auction.currentBidPrice == bidValue;
        _auction.currentBidAddress == msg.sender;

        // todo : lần bid N1 chỉ cần check >=  starting price
        // todo : lần bid N2 cần check bidValue >= currentBidPrice + priceStep
        // todo : transfer token of bidder in to contract
        // todo : if bidder bid với giá = buyout -> auction end , bidder is winner
        // todo : if bidder bid với giá > buyout -> auction end , FE show message hỏi bidder có muốn bid với giá này không ?

        emit NFTAuctionBidded(
            auctionId,
            _auction,
            previousBidValue,
            block.timestamp
        );
    }

    function buyOut(uint256 auctionId) external payable whenContractNotPaused {
        Auction storage _auction = auctions[auctionId];
        require(msg.sender != _auction.owner, "Buying owned NFT");
        require(block.timestamp < _auction.endTime, "auction is ended");

        // Transfer fund to contract
        DfyNFTLib.safeTransfer(
            _auction.currency,
            msg.sender,
            address(this),
            _auction.buyOutPrice
        );

        uint256 royaltyFee;

        // Calculate market fee
        uint256 marketFee = DfyNFTLib.calculateSystemFee(
            _auction.buyOutPrice,
            marketFeeRate,
            ZOOM
        );

        if (
            DefiForYouNFT(_auction.collectionAddress).originalCreator() ==
            _auction.owner
        ) {
            // Seller is original creator -> only charge market fee

            // Calculate amount paid to seller = purchase price - market fee

            (bool success, uint256 amountPaidToSeller) = _auction
                .buyOutPrice
                .trySub(marketFee);
            require(success);

            // transfer to seller
            DfyNFTLib.safeTransfer(
                _auction.currency,
                address(this),
                _auction.owner,
                amountPaidToSeller
            );

            // transfer to wallet market
            DfyNFTLib.safeTransfer(
                _auction.currency,
                address(this),
                marketFeeWallet,
                marketFee
            );
        } else {
            // Seller is not the original creator -> charge royalty fee & market fee

            // Calculate royalty fee

            royaltyFee = DfyNFTLib.calculateSystemFee(
                _auction.buyOutPrice,
                DefiForYouNFT(_auction.collectionAddress).royaltyRateByToken(
                    _auction.tokenId
                ),
                ZOOM
            );

            uint256 totalFeeCharged = marketFee + royaltyFee;
            (bool success, uint256 amountPaidToSeller) = _auction
                .buyOutPrice
                .trySub(totalFeeCharged);

            require(success);

            if (royaltyFee > 0) {
                // Transfer royalty fee to original creator of the collection
                DfyNFTLib.safeTransfer(
                    _auction.currency,
                    address(this),
                    DefiForYouNFT(_auction.collectionAddress).originalCreator(),
                    royaltyFee
                );
            }

            // Transfer market fee to fee wallet
            DfyNFTLib.safeTransfer(
                _auction.currency,
                address(this),
                marketFeeWallet,
                marketFee
            );

            // Transfer remaining amount to seller after deducting market fee and royalty fee
            DfyNFTLib.safeTransfer(
                _auction.currency,
                address(this),
                _auction.owner,
                amountPaidToSeller
            );

            // Transfer NFT to buyer
            DefiForYouNFT(_auction.collectionAddress).safeTransferFrom(
                address(this),
                msg.sender,
                _auction.tokenId
            );
        }

        _auction.status = AuctionStatus.FINISHED;

        emit NFTAuctionBoughtOut(
            auctionId,
            msg.sender,
            _auction.currentBidPrice,
            block.timestamp,
            _auction.status
        );
    }

    function fisnishAuctionSession(uint256 auctionId)
        external
        payable
        whenContractNotPaused
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        // todo : BE - call this function , contract pay token , nft for A - B
        Auction storage _auction = auctions[auctionId];

        require(block.timestamp > _auction.endTime, "Auction not over yet");

        uint256 marketFee = DfyNFTLib.calculateSystemFee(
            _auction.currentBidPrice,
            marketFeeRate,
            ZOOM
        );

        uint256 royaltyFee;

        if (_auction.currentBidAddress != address(0)) {
            if (
                DefiForYouNFT(_auction.collectionAddress).originalCreator() ==
                _auction.owner
            ) {
                // Seller is original creator -> only charge market fee
                // Calculate amount paid to seller = purchase price - market fee
                (bool success, uint256 amountPaidToSeller) = _auction
                    .currentBidPrice
                    .trySub(marketFee);
                require(success);

                DfyNFTLib.safeTransfer(
                    _auction.currency,
                    address(this),
                    _auction.owner,
                    amountPaidToSeller
                ); // after sub market fee transfer to seller

                DfyNFTLib.safeTransfer(
                    _auction.currency,
                    address(this),
                    marketFeeWallet,
                    marketFee
                );
            } else {
                // seller is not original creator -> charge royalty fee & market fee

                // Calculate royalty fee
                royaltyFee = DfyNFTLib.calculateSystemFee(
                    _auction.currentBidPrice,
                    DefiForYouNFT(_auction.collectionAddress)
                        .royaltyRateByToken(_auction.tokenId),
                    ZOOM
                );

                uint256 totalFeeCharged = marketFee + royaltyFee;

                (bool success, uint256 amountPaidToSeller) = _auction
                    .currentBidPrice
                    .trySub(totalFeeCharged);
                require(success);

                if (royaltyFee > 0) {
                    // Transfer royalty fee to original creator of the collection
                    DfyNFTLib.safeTransfer(
                        _auction.currency,
                        address(this),
                        DefiForYouNFT(_auction.collectionAddress)
                            .originalCreator(),
                        royaltyFee
                    );

                    // Transfer market fee to fee wallet
                    DfyNFTLib.safeTransfer(
                        _auction.currency,
                        address(this),
                        marketFeeWallet,
                        marketFee
                    );

                    // Transfer remaining amount to seller after deducting market fee and royalty fee
                    DfyNFTLib.safeTransfer(
                        _auction.currency,
                        address(this),
                        _auction.owner,
                        amountPaidToSeller
                    );
                }

                // Transfer NFT to buyer
                DefiForYouNFT(_auction.collectionAddress).safeTransferFrom(
                    address(this),
                    msg.sender,
                    _auction.tokenId
                );
            }
        } else {
            // pay nft back to seller
            DefiForYouNFT(_auction.collectionAddress).safeTransferFrom(
                address(this),
                _auction.owner,
                _auction.tokenId
            );
        }

        _auction.status = AuctionStatus.FINISHED;

        emit NFTAuctionFinished(
            auctionId,
            _auction.currentBidAddress,
            _auction.currentBidPrice,
            block.timestamp,
            _auction.status
        );
    }

    function cancelAuction(uint256 auctionId) external whenContractNotPaused {
        Auction storage _auction = auctions[auctionId];
        require(msg.sender == _auction.owner, "Auction's seller is required");

        require(
            block.timestamp < _auction.startTime,
            "can not cancel when auction is start"
        );

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
