const hre = require("hardhat");
const artifactDFYFactory = "DefiForYouNFTFactory";
const artifactAuctionNFT = "AuctionNFT";
const artifactSellNFT = "SellNFT";
const artifactHub = "Hub";
const artifactDFYNFT = "contracts/dfy-nft/DefiForYouNFT.sol:DefiForYouNFT";
const artifactDFYToken = "DFY";
const { expect, assert } = require("chai");
const BNB_ADDRESS = "0x0000000000000000000000000000000000000000";
const decimals = 10 ** 18;
const { time } = require("@openzeppelin/test-helpers");


describe("Deploy DFY Factory", (done) => {

    let _DFYFactoryContract = null;
    let _DFYContract = null;
    let _auctionNFTContract = null;
    let _sellNFTContract = null;
    let _DFYTokenContract = null;
    let _hubContract = null;

    let _tokenName = "DefiForYou";
    let _symbol = "DFY-NFT";
    let _royaltyRateDFY = 10 * 10 ** 5;
    let _zoom = 1e5;
    let _marketFeeRate = 2.5 * 10 ** 5; // 2,5 % 
    let _startingPrice = BigInt(1 * 10 ** 18);
    let _buyOutPrice = BigInt(10 * 10 ** 18);
    let _priceStep = BigInt(1 * 10 ** 18);
    let _cidOfCollection = "QmZfey7KWSZwwkU4DeBch6jsXSjdNp2UYYhVq4RZYPGr4Z";
    let _cidOfNFT = "QmbDE5EDoiGAYLTQzmftDx96L4UDMT6Ra2km5HqtU89JWn";
    let _firstToken = 0;

    const AuctionStatus = {
        PENDING: 0,
        APPROVED: 1,
        REJECTED: 2,
        FINISHED: 3,
        CANCELLED: 4
    };

    before(async () => {
        [
            _deployer,
            _originCreator,
            _adminApproveAuction,
            _bid1,
            _bid2,
            _bid3,
            _feeWallet,
            _feeWalletHub,
            _feeToken

        ] = await ethers.getSigners();

        // DFY Token 
        const dFYTokenFactory = await hre.ethers.getContractFactory(artifactDFYToken);
        const dfyContract = await dFYTokenFactory.deploy();
        _DFYTokenContract = await dfyContract.deployed();

        // contract Hub 
        const hubContractFactory = await hre.ethers.getContractFactory(artifactHub);
        const hubContract = await hre.upgrades.deployProxy(
            hubContractFactory,
            [_feeWalletHub.address, _feeToken.address, _deployer.address],
            { kind: "uups" }

        );
        _hubContract = await hubContract.deployed();
        console.log(_hubContract.address, "address hub contract : ");
        // set address token and address wallet 
        await _hubContract.connect(_deployer).setSystemConfig(_feeWallet.address, _DFYTokenContract.address);
        // set market fee rate auction 
        await _hubContract.setNFTMarketConfig(_zoom, _marketFeeRate, _feeWallet.address);

        // DFY Factory 
        const DFYFactory = await hre.ethers.getContractFactory(artifactDFYFactory);
        const DFYFactoryContract = await hre.upgrades.deployProxy(
            DFYFactory,
            [_hubContract.address],
            { kind: "uups" }
        );
        _DFYFactoryContract = await DFYFactoryContract.deployed();
        console.log(_DFYFactoryContract.address, "address DFY Factory contract : ");
        let getDFYFactorySignature = await _DFYFactoryContract.signature();

        // DFY NFT
        // setContractHub
        await _DFYFactoryContract.connect(_deployer).setContractHub(_hubContract.address);
        let getContractHub = await _DFYFactoryContract.contractHub();
        console.log(getContractHub.toString(), "get contract hub :");
        console.log(_hubContract.address, "hub contract address :");

        await _hubContract.registerContract(getDFYFactorySignature, _DFYFactoryContract.address, artifactDFYFactory);
        await _DFYFactoryContract.connect(_originCreator).createCollection(_tokenName, _symbol, 0, _cidOfCollection.toString());
        this.DFYNFTFactory = await hre.ethers.getContractFactory(artifactDFYNFT);
        let getAddressContractOfCreatetor = await _DFYFactoryContract.collectionsByOwner(_originCreator.address, 0);
        _DFYContract = this.DFYNFTFactory.attach(getAddressContractOfCreatetor);

        console.log(_DFYContract.address, "DFY contract address : ")

        // deploy contract SellNFT and registerContract in hub  
        const sellNFTFactory = await hre.ethers.getContractFactory(artifactSellNFT);
        const sellNFTContract = await hre.upgrades.deployProxy(
            sellNFTFactory,
            [_hubContract.address],
            { kind: "uups" }

        );
        _sellNFTContract = await sellNFTContract.deployed();
        console.log(_sellNFTContract.address, "address SellNFT contract : ");
        // hub call registerContract  
        const signatureSell = await _sellNFTContract.signature();
        await _hubContract.registerContract(signatureSell, _sellNFTContract.address, artifactSellNFT);


        // Auction NFT 
        const auctionNFTFactory = await hre.ethers.getContractFactory(artifactAuctionNFT);
        const auctionNFTContract = await hre.upgrades.deployProxy(
            auctionNFTFactory,
            [_hubContract.address],
            { kind: "uups" }

        );
        _auctionNFTContract = await auctionNFTContract.deployed();
        console.log(_auctionNFTContract.address, "address of auction contract : ");
        const signatureAuction = await _auctionNFTContract.signature();
        await _hubContract.registerContract(signatureAuction, _auctionNFTContract.address, artifactAuctionNFT);

    });

    describe("unit test DFY ", async () => {

        it("Case 1 :To test Time origin creator put on auction , check bidder bit use BNB to bid and finish with no royalty fee : ", async () => {

            // DFY Token air drop  
            await _DFYTokenContract.connect(_deployer).transfer(_bid1.address, BigInt(20 * 10 ** 18));
            await _DFYTokenContract.transfer(_bid2.address, BigInt(20 * 10 ** 18));
            await _DFYTokenContract.connect(_bid1).approve(_auctionNFTContract.address, BigInt(20 * 10 ** 18));
            await _DFYTokenContract.connect(_bid2).approve(_auctionNFTContract.address, BigInt(20 * 10 ** 18));

            // safe mint and approve 
            await _DFYContract.connect(_originCreator).safeMint(_originCreator.address, _royaltyRateDFY, _cidOfNFT);
            await _DFYContract.connect(_originCreator).setApprovalForAll(_auctionNFTContract.address, true);

            let ownerOfFistToken = await _DFYContract.ownerOf(_firstToken);
            console.log(ownerOfFistToken, "owner ");
            console.log(_originCreator.address, "origin creator ");

            let _startTime = Math.floor(Date.now() / 1000) + 260; // 2d     
            let _endTime = _startTime + 70; // 7d

            let getEventPutOnAuction = await _auctionNFTContract.connect(_originCreator).putOnAuction(_firstToken,
                _DFYContract.address,
                BigInt(1 * 10 ** 18),
                BigInt(10 * 10 ** 18),
                BigInt(1 * 10 ** 18),
                BNB_ADDRESS,
                _startTime,
                _endTime
            );
            let reciptEventPutOnAution = await getEventPutOnAuction.wait();
            console.log(`\x1b[31m Event customer put on auction \x1b[0m`);
            console.log(reciptEventPutOnAution.events[2]);
            expect(reciptEventPutOnAution.events[2].args[2]).to.equal(AuctionStatus.PENDING);

            let getOperatorRole = await _hubContract.OperatorRole();
            await _hubContract.connect(_deployer).grantRole(getOperatorRole, _adminApproveAuction.address);

            // admin approve for auction
            let getEventApproveAuction = await _auctionNFTContract.connect(_adminApproveAuction).approveAuction(0, 1);
            let reciptEventApproveAuction = await getEventApproveAuction.wait();
            console.log(`\x1b[31m Event admin approve auction \x1b[0m`);
            expect(reciptEventApproveAuction.events[0].args[1]).to.equal(AuctionStatus.APPROVED);

            let balanceOfBid1BeforeBid = await _bid1.getBalance();
            let balanceOfBid2BeforeBid = await _bid2.getBalance();
            let balanceOfOriginCreatorBeforeBid = await _originCreator.getBalance();
            let balanceOfFeeWalletBeforeBid = await _feeWallet.getBalance();

            console.log("info of auction before bid value ===========================");
            console.log("balance of bid 1 before bid ", balanceOfBid1BeforeBid.toString());
            console.log("balance of bid 2 before bid ", balanceOfBid2BeforeBid.toString());
            console.log("balance of origin creator before bid ", balanceOfOriginCreatorBeforeBid.toString());
            console.log("balance of fee wallet before bid ", balanceOfFeeWalletBeforeBid.toString());

            // bid 
            await time.increase(265);
            console.log(`\x1b[31m Event Bid1 bid : \x1b[0m`);
            let getEventBid1 = await _auctionNFTContract.connect(_bid1).bid(0, BigInt(1 * 10 ** 18), { value: BigInt(1 * 10 ** 18) });
            let reciptEventBid1 = await getEventBid1.wait();
            console.log(reciptEventBid1.events);
            console.log(`\x1b[31m Event Bid2 bid : \x1b[0m`);
            let getEventBid2 = await _auctionNFTContract.connect(_bid2).bid(0, BigInt(2 * 10 ** 18), { value: BigInt(2 * 10 ** 18) });
            let reciptEventBid2 = await getEventBid2.wait();
            console.log(reciptEventBid2.events);


            // finish 
            await time.increase(50);
            let getEventFinishAuction = await _auctionNFTContract.connect(_deployer).finishAuction(0);
            let reciptEventFinishAuction = await getEventFinishAuction.wait();
            console.log(`\x1b[31m Event finish auction : \x1b[0m`);
            console.log(reciptEventFinishAuction.events);
            expect(reciptEventFinishAuction.events[2].args[4]).to.equal(AuctionStatus.FINISHED);

            console.log("info of auction after bid value ===========================");
            let balanceOfBid1AfterBid = await _bid1.getBalance();
            let balanceOfBid2AfterBid = await _bid2.getBalance();
            let balanceOfOriginCreatorAfterBid = await _originCreator.getBalance();
            let balanceOfFeeWalletAfterBid = await _feeWallet.getBalance();
            let newOwner = await _DFYContract.ownerOf(0);

            console.log("balance of bid 1 after Bid  : ", balanceOfBid1AfterBid.toString());
            console.log("balance of bid 2 after Bid : ", balanceOfBid2AfterBid.toString());
            console.log("balance of origin creator afer Bid : ", balanceOfOriginCreatorAfterBid.toString());
            console.log("balance of fee market after Bid :", balanceOfFeeWalletAfterBid.toString());

            // calculator 
            infoAuction = await _auctionNFTContract.auctions(0);
            let marketFee = BigInt(infoAuction.bidValue) * BigInt(_marketFeeRate) / BigInt(_zoom * 100);
            let amountPaidToSeller = BigInt(infoAuction.bidValue) - BigInt(marketFee);
            let feeGasBuyOfBid1 = BigInt(balanceOfBid1BeforeBid) - BigInt(balanceOfBid1AfterBid);
            let feeGasBuyOfBid2 = BigInt(balanceOfBid2BeforeBid) - BigInt(balanceOfBid2AfterBid) - BigInt(infoAuction.bidValue);

            expect(balanceOfBid1BeforeBid).to.equal(BigInt(balanceOfBid1AfterBid) + BigInt(feeGasBuyOfBid1));
            expect(balanceOfBid2BeforeBid).to.equal(BigInt(balanceOfBid2AfterBid) + BigInt(infoAuction.bidValue) + BigInt(feeGasBuyOfBid2));
            expect(balanceOfFeeWalletAfterBid).to.equal(BigInt(balanceOfFeeWalletBeforeBid) + BigInt(marketFee));
            expect(balanceOfOriginCreatorBeforeBid).to.equal(BigInt(balanceOfOriginCreatorAfterBid) - BigInt(amountPaidToSeller));
            expect(newOwner === _bid2.address);


        });

        it("Case 2: To test Time not origin creator put on auction , check bidder bit use BEP20 bid to buyOut with royalty fee : ", async () => {

            // DFY Token air drop  
            await _DFYTokenContract.connect(_deployer).transfer(_bid1.address, BigInt(20 * 10 ** 18));
            await _DFYTokenContract.transfer(_bid2.address, BigInt(20 * 10 ** 18));
            await _DFYTokenContract.transfer(_bid3.address, BigInt(20 * 10 ** 18));
            await _DFYTokenContract.connect(_bid1).approve(_auctionNFTContract.address, BigInt(20 * 10 ** 18));
            await _DFYTokenContract.connect(_bid3).approve(_auctionNFTContract.address, BigInt(20 * 10 ** 18));

            // safe mint and approve 
            await _DFYContract.connect(_bid2).setApprovalForAll(_auctionNFTContract.address, true);

            let _startTime = Math.floor(Date.now() / 1000) + 640 + 255;
            let _endTime = _startTime + 70;

            await _auctionNFTContract.connect(_bid2).putOnAuction(_firstToken,
                _DFYContract.address,
                _startingPrice,
                _buyOutPrice,
                _priceStep,
                _DFYTokenContract.address,
                _startTime,
                _endTime
            );

            let balanceOfBid1BeforeBid = await _DFYTokenContract.balanceOf(_bid1.address);
            let balanceOfBid2BeforePutOnAuction = await _DFYTokenContract.balanceOf(_bid2.address);
            let balanceOfBid3BeforeBidWithBuyOutPrice = await _DFYTokenContract.balanceOf(_bid3.address);
            let balanceOfOriginCreatorBeforeBid = await _DFYTokenContract.balanceOf(_originCreator.address);
            let balanceOfFeeWalletBeforeBid = await _DFYTokenContract.balanceOf(_feeWallet.address);

            console.log("info of auction before bid value ===========================");
            console.log("balance of bid 1 before Bid ", balanceOfBid1BeforeBid.toString());
            console.log("balance of bid 2 before Put on Auction ", balanceOfBid2BeforePutOnAuction.toString());
            console.log("balance of bid 3 before Bid with buy out price ", balanceOfBid3BeforeBidWithBuyOutPrice.toString());
            console.log("balance of origin creator before Bid", balanceOfOriginCreatorBeforeBid.toString());
            console.log("balance of fee wallet before Bid ", balanceOfFeeWalletBeforeBid.toString());

            // admin approve for auction
            await _auctionNFTContract.connect(_deployer).approveAuction(1, 1);

            await time.increase(590);
            await _auctionNFTContract.connect(_bid1).bid(1, BigInt(2 * 10 ** 18));
            let getEventBuyOut = await _auctionNFTContract.connect(_bid3).bid(1, BigInt(10 * 10 ** 18));
            let reciptEventBuyOut = await getEventBuyOut.wait();
            console.log(`\x1b[31m Event Bid 3 bid with buyout price : \x1b[0m`);
            console.log(reciptEventBuyOut.events[8]);
            expect(reciptEventBuyOut.events[8].args[4]).to.equal(AuctionStatus.FINISHED);

            console.log("info of auction after bid value ===========================");

            let balanceOfBid1AfterBid = await _DFYTokenContract.balanceOf(_bid1.address);
            let balanceOfBid2AfterPutOnAuction = await _DFYTokenContract.balanceOf(_bid2.address);
            let balanceOfBid3AfterBitWithBuyOutPrice = await _DFYTokenContract.balanceOf(_bid3.address);
            let balanceOfOriginCreatorAfterBid = await _DFYTokenContract.balanceOf(_originCreator.address);
            let balanceOfFeeWalletAfterBid = await _DFYTokenContract.balanceOf(_feeWallet.address);
            let newOwner = await _DFYContract.ownerOf(0);

            console.log("balance of bid 1 after Bid  : ", balanceOfBid1AfterBid.toString());
            console.log("balance of bid2 after Bid :", balanceOfBid2AfterPutOnAuction.toString());
            console.log("balance of bid 3 after Bid  : ", balanceOfBid3AfterBitWithBuyOutPrice.toString());
            console.log("balance of origin creator afer Bid : ", balanceOfOriginCreatorAfterBid.toString());
            console.log("balance of fee market after Bid :", balanceOfFeeWalletAfterBid.toString());

            // calculator 
            infoAuction = await _auctionNFTContract.auctions(1);
            let marketFee = BigInt(infoAuction.bidValue) * BigInt(_marketFeeRate) / BigInt(_zoom * 100);
            let royaltyFee = BigInt(infoAuction.bidValue) * BigInt(_royaltyRateDFY) / BigInt(_zoom * 100);
            let amountPaidToSeller = BigInt(infoAuction.bidValue) - BigInt(marketFee) - BigInt(royaltyFee);

            expect(balanceOfBid1BeforeBid).to.equal(BigInt(balanceOfBid1AfterBid));
            expect(balanceOfBid2BeforePutOnAuction).to.equal(BigInt(balanceOfBid2AfterPutOnAuction) - BigInt(amountPaidToSeller));
            expect(balanceOfBid3BeforeBidWithBuyOutPrice).to.equal(BigInt(balanceOfBid3AfterBitWithBuyOutPrice) + BigInt(infoAuction.bidValue));
            expect(balanceOfFeeWalletAfterBid).to.equal(BigInt(balanceOfFeeWalletBeforeBid) + BigInt(marketFee));
            expect(balanceOfOriginCreatorBeforeBid).to.equal(BigInt(balanceOfOriginCreatorAfterBid) - BigInt(royaltyFee));
            expect(newOwner === _bid3.address);

        });

        it("Case 3 :To test Time not origin creator put on auction , check bidder use BEP20 to buyOut with royalty fee :", async () => {

            await _DFYContract.connect(_bid3).setApprovalForAll(_auctionNFTContract.address, true);

            let _startTime = Math.floor(Date.now() / 1000) + 1000 + 255;
            let _endTime = _startTime + 70;

            await _auctionNFTContract.connect(_bid3).putOnAuction(_firstToken,
                _DFYContract.address,
                _startingPrice,
                _buyOutPrice,
                _priceStep,
                _DFYTokenContract.address,
                _startTime,
                _endTime
            );

            // admin approve for auction
            await _auctionNFTContract.connect(_deployer).approveAuction(2, 1);

            let balanceOfBid1BeforeBid = await _DFYTokenContract.balanceOf(_bid1.address);
            let balanceOfBid2BeforebuyOut = await _DFYTokenContract.balanceOf(_bid2.address);
            let balanceOfBid3BeforePutOnAuction = await _DFYTokenContract.balanceOf(_bid3.address);
            let balanceOfOriginCreatorBeforeBuyOut = await _DFYTokenContract.balanceOf(_originCreator.address);
            let balanceOfFeeWalletBeforeBuyOut = await _DFYTokenContract.balanceOf(_feeWallet.address);

            console.log("info of auction before bid value ===========================");
            console.log("balance of bid 1 before Bid ", balanceOfBid1BeforeBid.toString());
            console.log("balance of bid 2 before buyOut ", balanceOfBid2BeforebuyOut.toString());
            console.log("balance of bid 3 before putOnAuction ", balanceOfBid3BeforePutOnAuction.toString());
            console.log("balance of origin creator before buyOut", balanceOfOriginCreatorBeforeBuyOut.toString());
            console.log("balance of fee wallet before buyOut ", balanceOfFeeWalletBeforeBuyOut.toString());

            await time.increase(350);
            await _auctionNFTContract.connect(_bid1).bid(2, BigInt(2 * 10 ** 18));
            let getEventBuyOut = await _auctionNFTContract.connect(_bid2).buyOut(2);
            let reciptEventBuyOut = await getEventBuyOut.wait();
            console.log(`\x1b[31m Event Bid1 bid : \x1b[0m`);
            console.log(reciptEventBuyOut.events);
            expect(reciptEventBuyOut.events[8].args[4]).to.equal(AuctionStatus.FINISHED);

            console.log("info of auction after bid value ===========================");

            let balanceOfBid1AfterBid = await _DFYTokenContract.balanceOf(_bid1.address);
            let balanceOfBid2AfterBuyout = await _DFYTokenContract.balanceOf(_bid2.address);
            let balanceOfBid3AfterPutOnAuction = await _DFYTokenContract.balanceOf(_bid3.address);
            let balanceOfOriginCreatorAfterBuyOut = await _DFYTokenContract.balanceOf(_originCreator.address);
            let balanceOfFeeWalletAfterBuyOut = await _DFYTokenContract.balanceOf(_feeWallet.address);
            let newOwner = await _DFYContract.ownerOf(0);

            console.log("balance of bid 1 after Bid  : ", balanceOfBid1AfterBid.toString());
            console.log("balance of bid2 after Buy out :", balanceOfBid2AfterBuyout.toString());
            console.log("balance of bid 3 after Put on Auction  : ", balanceOfBid3AfterPutOnAuction.toString());
            console.log("balance of origin creator afer Buy out : ", balanceOfOriginCreatorAfterBuyOut.toString());
            console.log("balance of fee market after Buy out :", balanceOfFeeWalletAfterBuyOut.toString());

            // calculator 
            infoAuction = await _auctionNFTContract.auctions(2);
            let marketFee = BigInt(infoAuction.bidValue) * BigInt(_marketFeeRate) / BigInt(_zoom * 100);
            let royaltyFee = BigInt(infoAuction.bidValue) * BigInt(_royaltyRateDFY) / BigInt(_zoom * 100);
            let amountPaidToSeller = BigInt(infoAuction.bidValue) - BigInt(marketFee) - BigInt(royaltyFee);

            expect(balanceOfBid1BeforeBid).to.equal(BigInt(balanceOfBid1AfterBid)); // bid 1 bid 
            expect(balanceOfBid2BeforebuyOut).to.equal(BigInt(balanceOfBid2AfterBuyout) + BigInt(infoAuction.auctionData.buyOutPrice)); // bid 2 buyer 
            expect(balanceOfBid3BeforePutOnAuction).to.equal(BigInt(balanceOfBid3AfterPutOnAuction) - BigInt(amountPaidToSeller)); // bid 3 seller 
            expect(balanceOfFeeWalletAfterBuyOut).to.equal(BigInt(balanceOfFeeWalletBeforeBuyOut) + BigInt(marketFee));
            expect(balanceOfOriginCreatorBeforeBuyOut).to.equal(BigInt(balanceOfOriginCreatorAfterBuyOut) - BigInt(royaltyFee)); // origin creator
            expect(newOwner === _bid2.address);

        });

        it("Case 4 :To test Time not origin creator put on auction admin reject auction ", async () => {

            await _DFYContract.connect(_bid2).setApprovalForAll(_auctionNFTContract.address, true);

            let _startTime = Math.floor(Date.now() / 1000) + 1500 + 255;
            let _endTime = _startTime + 70;

            await _auctionNFTContract.connect(_bid2).putOnAuction(_firstToken,
                _DFYContract.address,
                _startingPrice,
                _buyOutPrice,
                _priceStep,
                _DFYTokenContract.address,
                _startTime,
                _endTime
            );

            // admin REJECTED auction
            let getEventReject = await _auctionNFTContract.connect(_deployer).approveAuction(3, 2);
            let reciptEventReject = await getEventReject.wait();
            let infoAuction = await _auctionNFTContract.auctions(3);
            console.log(`\x1b[31m Event Admin reject auction : \x1b[0m`);
            console.log(reciptEventReject.events);
            expect(infoAuction.status).to.equal(AuctionStatus.REJECTED);

        });

        it("Case 5 : not origin creator put on auction owner auction self cancel listing and put on auction again ", async () => {

            await _DFYContract.connect(_bid2).setApprovalForAll(_auctionNFTContract.address, true);

            let _startTime = Math.floor(Date.now() / 1000) + 2000 + 255;
            let _endTime = _startTime + 70;

            await _auctionNFTContract.connect(_bid2).putOnAuction(_firstToken,
                _DFYContract.address,
                _startingPrice,
                _buyOutPrice,
                _priceStep,
                _DFYTokenContract.address,
                _startTime,
                _endTime
            );

            let getEventCancel = await _auctionNFTContract.connect(_bid2).cancelAuction(4);
            let reciptEventCancel = await getEventCancel.wait();
            let infoAuction = await _auctionNFTContract.auctions(4);
            console.log(`\x1b[31m Event Admin reject auction : \x1b[0m`);
            console.log(reciptEventCancel.events[2]);

            expect(infoAuction.status).to.equal(AuctionStatus.CANCELLED);

            let checkOwnerNFT = await _DFYContract.ownerOf(_firstToken);
            console.log(checkOwnerNFT.toString());
            console.log(_auctionNFTContract.address);
            console.log(_bid2.address);

            let getEventPutOnAuction = await _auctionNFTContract.connect(_bid2).putOnAuction(_firstToken,
                _DFYContract.address,
                BigInt(2 * 10 ** 18),
                _buyOutPrice,
                _priceStep,
                _DFYTokenContract.address,
                _startTime,
                _endTime
            );
            let reciptEventPutOnAuction = await getEventPutOnAuction.wait();
            let auctions = await _auctionNFTContract.auctions(5);
            console.log(auctions.toString());
            console.log(reciptEventPutOnAuction.events);

            expect(auctions.status).to.equal(AuctionStatus.PENDING);
        });

        // case 6 : if endtime auction is don't have bid value, refund nft for owner  

    });
});