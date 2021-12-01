const hre = require("hardhat");
const artifactDFYFactory = "DefiForYouNFTFactory";
const artifactDFY = "DefiForYouNFT";
const artifactTia = "TiaToken";
const artifactDFYToken = "BEP20Token";
const artifactAuctionNFT = "AuctionNFT";
const artifactHub = "Hub";
const { expect, assert } = require("chai");
const BNB_ADDRESS = "0x0000000000000000000000000000000000000000";
const decimals = 10 ** 18;
const { time } = require("@openzeppelin/test-helpers");


describe("Deploy DFY Factory", (done) => {

    let _DFYFactoryContract = null;
    let _DFYContract = null;
    let _tiaContract = null;
    let _auctionNFTContract = null;
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

    before(async () => {
        [
            _deployer,
            _originCreator,
            _bid1,
            _bid2,
            _bid3,
            _feeWallet,
            _feeWalletHub,
            _feeToken

        ] = await ethers.getSigners();

        // Tia Token 
        const tiaTokenFactory = await hre.ethers.getContractFactory(artifactTia);
        const tiaContract = await tiaTokenFactory.deploy();
        _tiaContract = await tiaContract.deployed();

        // DFY Token 
        const dFYTokenFactory = await hre.ethers.getContractFactory(artifactDFYToken);
        const dfyContract = await dFYTokenFactory.deploy(
            "DFY-Token",
            "DFY",
            BigInt(1000000000000000000000)
        );
        _DFYTokenContract = await dfyContract.deployed();

        // contract Hub 
        console.log(_feeWalletHub.address, "feewallet ");
        console.log(_feeToken.address, "fee token ");

        const hubContractFactory = await hre.ethers.getContractFactory(artifactHub);
        const hubContract = await hre.upgrades.deployProxy(
            hubContractFactory,
            [_feeWalletHub.address, _feeToken.address],
            { kind: "uups" }

        );
        _hubContract = await hubContract.deployed();
        console.log(_hubContract.address, "address hub contract : ");
        // set address token and address wallet 
        await _hubContract.connect(_deployer).setSystemFeeToken(_DFYTokenContract.address);
        await _hubContract.connect(_deployer).setSystemFeeWallet(_feeWallet.address);
        // set market fee rate auction 
        await _hubContract.setNFTMarketConfig(_zoom, _marketFeeRate, _feeWallet.address);

        // DFY Factory 
        const DFYFactory = await hre.ethers.getContractFactory(artifactDFYFactory);
        const DFYFactoryContract = await hre.upgrades.deployProxy(
            DFYFactory,
            { kind: "uups" }
        );
        _DFYFactoryContract = await DFYFactoryContract.deployed();
        console.log(_DFYFactoryContract.address, "address DFY Factory contract : ");

        // DFY NFT
        // setContractHub
        await _DFYFactoryContract.connect(_deployer).setContractHub(_hubContract.address);
        let getContractHub = await _DFYFactoryContract.contractHub();
        console.log(getContractHub.toString(), "get contract hub :");
        console.log(_hubContract.address, "hub contract address :");

        let getOperatorRole = await _DFYFactoryContract.OPERATOR_ROLE();
        await _DFYFactoryContract.connect(_deployer).grantRole(getOperatorRole, _originCreator.address);
        await _DFYFactoryContract.connect(_originCreator).createCollection(_tokenName, _symbol, 0, _cidOfCollection.toString());
        this.DFYNFTFactory = await hre.ethers.getContractFactory("DefiForYouNFT");
        let getAddressContractOfCreatetor = await _DFYFactoryContract.collectionsByOwner(_originCreator.address, 0);
        _DFYContract = this.DFYNFTFactory.attach(getAddressContractOfCreatetor);

        console.log(_DFYContract.address, "DFY contract address : ")

        // Auction NFT 
        const auctionNFTFactory = await hre.ethers.getContractFactory(artifactAuctionNFT);
        const auctionNFTContract = await hre.upgrades.deployProxy(
            auctionNFTFactory,
            [_hubContract.address],
            { kind: "uups" }

        );
        _auctionNFTContract = await auctionNFTContract.deployed();
        console.log(_auctionNFTContract.address, "address SellNFT contract : ");

    });

    describe("unit test DFY ", async () => {

        it("To test Time origin creator put on auction , check bidder bit use BNB to bid and finish with no royalty fee : ", async () => {

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

            let _startTime = Math.floor(Date.now() / 1000) + 255; // 2d 
            let _endTime = _startTime + 70; // 7d

            await _auctionNFTContract.connect(_originCreator).putOnAuction(_firstToken,
                _DFYContract.address,
                BigInt(1 * 10 ** 18),
                BigInt(10 * 10 ** 18),
                BigInt(1 * 10 ** 18),
                BNB_ADDRESS,
                _startTime,
                _endTime
            );

            let getOperatorRole = await _auctionNFTContract.OPERATOR_ROLE();
            await _auctionNFTContract.connect(_deployer).grantRole(getOperatorRole, _deployer.address);

            // admin approve for auction
            await _auctionNFTContract.connect(_deployer).approveAuction(0, 1);

            let balanceOfBid1BeforeTXT = await _bid1.getBalance();
            let balanceOfBid2BeforeBidTXT = await _bid2.getBalance();
            let balanceOfOriginCreatorBeforeTXT = await _originCreator.getBalance();
            let balanceOfFeeWalletBeforeTXT = await _feeWallet.getBalance();

            console.log("info of auction before bid value ===========================");
            console.log("balance of bid 1 before TXT ", balanceOfBid1BeforeTXT.toString());
            console.log("balance of bid 2 before TXT ", balanceOfBid2BeforeBidTXT.toString());
            console.log("balance of origin creator before TXT", balanceOfOriginCreatorBeforeTXT.toString());
            console.log("balance of fee wallet before TXT ", balanceOfFeeWalletBeforeTXT.toString());

            await time.increase(265);

            await _auctionNFTContract.connect(_bid1).bid(0, BigInt(1 * 10 ** 18), { value: BigInt(1 * 10 ** 18) });
            let checkBidValue = await _auctionNFTContract.connect(_bid2).bid(0, BigInt(2 * 10 ** 18), { value: BigInt(2 * 10 ** 18) });
            // let recipt = await checkBidValue.wait();
            // console.log(recipt.events[3], "event");

            // let balanceOfBid1AfterTXT = await _bid1.getBalance();
            // console.log("balance of bid 1 after TXT  : ", balanceOfBid1AfterTXT.toString());

            // finish 
            await time.increase(50);
            await _auctionNFTContract.connect(_deployer).finishAuction(0);

            console.log("info of auction after bid value ===========================");

            let balanceOfBid1AfterTXT = await _bid1.getBalance();
            let balanceOfBid2AfterTXT = await _bid2.getBalance();
            let newOwner = await _DFYContract.ownerOf(0);
            let balanceOfOriginCreatorAfterTXT = await _originCreator.getBalance();
            let balanceOfFeeWalletAfterTXT = await _feeWallet.getBalance();

            console.log("balance of bid 1 after TXT  : ", balanceOfBid1AfterTXT.toString());
            console.log("balance of bid 2 after TXT : ", balanceOfBid2AfterTXT.toString());
            console.log("balance of origin creator afer TXT : ", balanceOfOriginCreatorAfterTXT.toString());
            console.log("balance of fee market after TXT :", balanceOfFeeWalletAfterTXT.toString());

            // calculator 
            infoAuction = await _auctionNFTContract.auctions(0);
            let marketFee = BigInt(infoAuction.bidValue) * BigInt(_marketFeeRate) / BigInt(_zoom * 100);
            let amountPaidToSeller = BigInt(infoAuction.bidValue) - BigInt(marketFee);
            let feeGasBuyOfBid1 = BigInt(82394322831000);
            let feeGasBuyOfBid2 = BigInt(72538879665364);

            expect(balanceOfBid1BeforeTXT).to.equal(BigInt(balanceOfBid1AfterTXT) + BigInt(feeGasBuyOfBid1));
            expect(balanceOfBid2BeforeBidTXT).to.equal(BigInt(balanceOfBid2AfterTXT) + BigInt(infoAuction.bidValue) + BigInt(feeGasBuyOfBid2));
            expect(balanceOfFeeWalletAfterTXT).to.equal(BigInt(balanceOfFeeWalletBeforeTXT) + BigInt(marketFee));
            expect(balanceOfOriginCreatorBeforeTXT).to.equal(BigInt(balanceOfOriginCreatorAfterTXT) - BigInt(amountPaidToSeller));
            expect(newOwner === _bid2.address);

        });

        // it("To test Time not origin creator put on auction , check bidder bit use BEP20 to bid and finish auction with royalty fee : ", async () => {

        //     // DFY Token air drop  
        //     await _DFYTokenContract.connect(_deployer).transfer(_bid1.address, BigInt(20 * 10 ** 18));
        //     await _DFYTokenContract.transfer(_bid2.address, BigInt(20 * 10 ** 18));
        //     await _DFYTokenContract.connect(_bid1).approve(_auctionNFTContract.address, BigInt(20 * 10 ** 18));
        //     await _DFYTokenContract.connect(_bid2).approve(_auctionNFTContract.address, BigInt(20 * 10 ** 18));

        //     // safe mint and approve 
        //     await _DFYContract.connect(_originCreator).setApprovalForAll(_auctionNFTContract.address, true);

        //     let ownerOfFistToken = await _DFYContract.ownerOf(_firstToken);
        //     console.log(ownerOfFistToken, "owner ");
        //     console.log(_originCreator.address, "origin creator ");

        //     let _startTime = Math.floor(Date.now() / 1000) + 640 + 255; // 2d 
        //     let _endTime = _startTime + 70; // 7d

        //     await _auctionNFTContract.connect(_originCreator).putOnAuction(_firstToken,
        //         _DFYContract.address,
        //         _startingPrice,
        //         _buyOutPrice,
        //         _priceStep,
        //         BNB_ADDRESS,
        //         _startTime,
        //         _endTime
        //     );

        //     // let infoAuction = await _auctionNFTContract.auctions(0);
        //     // console.log(infoAuction.auctionData.collectionAddress.toString(), "collectionAddress");
        //     // console.log(infoAuction.auctionData.owner.toString(), "owner");
        //     // console.log(infoAuction.auctionData.startingPrice.toString(), "startingPrice");
        //     // console.log(infoAuction.auctionData.buyOutPrice.toString(), "buyOutPrice");
        //     // console.log(infoAuction.auctionData.priceStep.toString(), "priceStep");
        //     // console.log(infoAuction.bidValue.toString(), "currentBidPrice");
        //     // console.log(infoAuction.winner.toString(), "winner");
        //     // console.log(infoAuction.auctionData.currency.toString(), "currency");
        //     // console.log(infoAuction.auctionData.startTime.toString(), "startTime");
        //     // console.log(infoAuction.auctionData.endTime.toString(), "endTime");
        //     // console.log(infoAuction.status.toString(), "status");


        //     let getOperatorRole = await _auctionNFTContract.OPERATOR_ROLE();
        //     await _auctionNFTContract.connect(_deployer).grantRole(getOperatorRole, _deployer.address);

        //     // admin approve for auction
        //     await _auctionNFTContract.connect(_deployer).approveAuction(0, 1);

        //     let balanceOfBid1BeforeTXT = await _bid1.getBalance();
        //     let balanceOfBid2BeforeBidTXT = await _bid2.getBalance();
        //     let balanceOfOriginCreatorBeforeTXT = await _originCreator.getBalance();
        //     let balanceOfFeeWalletBeforeTXT = await _feeWallet.getBalance();

        //     console.log("info of auction before bid value ===========================");
        //     console.log("balance of bid 1 before TXT ", balanceOfBid1BeforeTXT.toString());
        //     console.log("balance of bid 2 before TXT ", balanceOfBid2BeforeBidTXT.toString());
        //     console.log("balance of origin creator before TXT", balanceOfOriginCreatorBeforeTXT.toString());
        //     console.log("balance of fee wallet before TXT ", balanceOfFeeWalletBeforeTXT.toString());

        //     await time.increase(265);
        //     await _auctionNFTContract.connect(_bid1).bid(0, BigInt(1000000000000000026), { value: BigInt(1000000000000000026) });
        //     await _auctionNFTContract.connect(_bid2).bid(0, BigInt(2 * 10 ** 18), { value: BigInt(2 * 10 ** 18) });

        //     // finish 
        //     await time.increase(50);
        //     await _auctionNFTContract.connect(_deployer).finishAuction(0);

        //     console.log("info of auction after bid value ===========================");

        //     let balanceOfBid1AfterTXT = await _bid1.getBalance();
        //     let balanceOfBid2AfterTXT = await _bid2.getBalance();
        //     let newOwner = await _DFYContract.ownerOf(0);
        //     let balanceOfOriginCreatorAfterTXT = await _originCreator.getBalance();
        //     let balanceOfFeeWalletAfterTXT = await _feeWallet.getBalance();

        //     console.log("balance of bid 1 after TXT  : ", balanceOfBid1AfterTXT.toString());
        //     console.log("balance of bid 2 after TXT : ", balanceOfBid2AfterTXT.toString());
        //     console.log("balance of origin creator afer TXT : ", balanceOfOriginCreatorAfterTXT.toString());
        //     console.log("balance of fee market after TXT :", balanceOfFeeWalletAfterTXT.toString());

        //     // calculator 
        //     infoAuction = await _auctionNFTContract.auctions(0);
        //     let marketFee = BigInt(infoAuction.bidValue) * BigInt(_marketFeeRate) / BigInt(_zoom * 100);
        //     let amountPaidToSeller = BigInt(infoAuction.bidValue) - BigInt(marketFee);
        //     let feeGasBuyOfBid1 = "82393270152000"; // 82223952067008
        //     let feeGasBuyOfBid2 = "72538064095464";  // 72369715420716

        //     expect(balanceOfBid1BeforeTXT).to.equal(BigInt(balanceOfBid1AfterTXT) + BigInt(feeGasBuyOfBid1));
        //     expect(balanceOfBid2BeforeBidTXT).to.equal(BigInt(balanceOfBid2AfterTXT) + BigInt(infoAuction.bidValue) + BigInt(feeGasBuyOfBid2));
        //     expect(balanceOfFeeWalletAfterTXT).to.equal(BigInt(balanceOfFeeWalletBeforeTXT) + BigInt(marketFee));
        //     expect(balanceOfOriginCreatorBeforeTXT).to.equal(BigInt(balanceOfOriginCreatorAfterTXT) - BigInt(amountPaidToSeller));
        //     expect(newOwner === _bid2.address);

        // });

        // it("not origin creator put on Auction, check bidder bid use erc20 and buyOut price with royalty Fee", async () => {

        //     // Tia Token air drop  
        //     await _tiaContract.connect(_deployer).setOperator(_deployer.address, true);
        //     await _tiaContract.mint(_deployer.address, BigInt(100 * 10 ** 18));
        //     await _tiaContract.transfer(_bid1.address, BigInt(20 * 10 ** 18));
        //     await _tiaContract.transfer(_bid2.address, BigInt(20 * 10 ** 18));
        //     await _tiaContract.connect(_bid1).approve(_auctionNFTContract.address, BigInt(20 * 10 ** 18));
        //     await _tiaContract.connect(_bid2).approve(_auctionNFTContract.address, BigInt(20 * 10 ** 18));

        //     // safe mint and approve 
        //     await _DFYContract.connect(_bid2).setApprovalForAll(_auctionNFTContract.address, true);

        //     let _startTime = Math.floor(Date.now() / 1000) + 650 + 260;  // 2days
        //     let _endTime = _startTime + 70; // 2days + 12hour

        //     await _auctionNFTContract.connect(_bid2).putOnAuction(_firstToken,
        //         _DFYContract.address,
        //         _startingPrice,
        //         _buyOutPrice,
        //         _priceStep,
        //         _tiaContract.address,
        //         _startTime,
        //         _endTime
        //     );

        //     // admin approve for auction
        //     await _auctionNFTContract.connect(_deployer).approveAuction(1, 1);

        //     let balanceOfBid1BeforeTXT = await _tiaContract.balanceOf(_bid1.address);
        //     let balanceOfBid2BeforeBidTXT = await _tiaContract.balanceOf(_bid2.address);
        //     let balanceOfOriginCreatorBeforeTXT = await _tiaContract.balanceOf(_originCreator.address);
        //     let balanceOfFeeWalletBeforeTXT = await _tiaContract.balanceOf(_feeWallet.address);

        //     console.log("info of auction before bid value ===========================");
        //     console.log("balance of bid 1 - buyer before TXT ", balanceOfBid1BeforeTXT.toString());
        //     console.log("balance of bid 2 - seller before TXT ", balanceOfBid2BeforeBidTXT.toString());
        //     console.log("balance of origin creator before TXT ", balanceOfOriginCreatorBeforeTXT.toString());
        //     console.log("balance of fee wallet before TXT ", balanceOfFeeWalletBeforeTXT.toString());

        //     await time.increase(580);

        //     // bid with buyOutPrice -> buyOut 
        //     await _auctionNFTContract.connect(_bid1).bid(1, BigInt(10 * 10 ** 18));

        //     console.log("info of auction after bid value ===========================");

        //     let balanceOfBid1AfterTXT = await _tiaContract.balanceOf(_bid1.address);
        //     let balanceOfBid2AfterTXT = await _tiaContract.balanceOf(_bid2.address);
        //     let newOwner = await _DFYContract.ownerOf(0);
        //     let balanceOfOriginCreatorAfterTXT = await _tiaContract.balanceOf(_originCreator.address);
        //     let balanceOfFeeWalletAfterTXT = await _tiaContract.balanceOf(_feeWallet.address);

        //     console.log("balance of bid 1 - buyer after TXT  : ", balanceOfBid1AfterTXT.toString());
        //     console.log("balance of bid 2 - seller after TXT : ", balanceOfBid2AfterTXT.toString());
        //     console.log("balance of origin creator afer TXT : ", balanceOfOriginCreatorAfterTXT.toString());
        //     console.log("balance of fee market after TXT :", balanceOfFeeWalletAfterTXT.toString());

        //     // calculator 
        //     let infoAuction = await _auctionNFTContract.auctions(1);
        //     let marketFee = BigInt(infoAuction.auctionData.buyOutPrice) * BigInt(_marketFeeRate) / BigInt(_zoom * 100);
        //     let royaltyFee = BigInt(infoAuction.auctionData.buyOutPrice) * BigInt(_royaltyRateDFY) / BigInt(_zoom * 100);
        //     let amountPaidToSeller = BigInt(infoAuction.auctionData.buyOutPrice) - BigInt(marketFee) - BigInt(royaltyFee);

        //     expect(balanceOfBid1BeforeTXT).to.equal(BigInt(balanceOfBid1AfterTXT) + BigInt(infoAuction.auctionData.buyOutPrice));
        //     expect(balanceOfBid2BeforeBidTXT).to.equal(BigInt(balanceOfBid2AfterTXT) - BigInt(amountPaidToSeller));
        //     expect(balanceOfFeeWalletBeforeTXT).to.equal(BigInt(balanceOfFeeWalletAfterTXT) - BigInt(marketFee));
        //     expect(newOwner === _bid1.address);
        // });


        // it("to test time not origin creator put on Auction, check bidder bid use erc20 to buyOut price with royalty Fee", async () => {

        //     // Tia Token air drop  
        //     await _tiaContract.connect(_deployer).setOperator(_deployer.address, true);
        //     await _tiaContract.mint(_deployer.address, BigInt(100 * 10 ** 18));
        //     await _tiaContract.transfer(_bid1.address, BigInt(20 * 10 ** 18));
        //     await _tiaContract.transfer(_bid2.address, BigInt(20 * 10 ** 18));
        //     await _tiaContract.connect(_bid1).approve(_auctionNFTContract.address, BigInt(20 * 10 ** 18));
        //     await _tiaContract.connect(_bid2).approve(_auctionNFTContract.address, BigInt(20 * 10 ** 18));

        //     // safe mint and approve 
        //     await _DFYContract.connect(_bid1).setApprovalForAll(_auctionNFTContract.address, true);


        //     let _startTime = Math.floor(Date.now() / 1000) + 960 + 260;  // 2days
        //     let _endTime = _startTime + 60 + 10; // 2days + 12hour

        //     await _auctionNFTContract.connect(_bid1).putOnAuction(_firstToken,
        //         _DFYContract.address,
        //         _startingPrice,
        //         _buyOutPrice,
        //         _priceStep,
        //         _tiaContract.address,
        //         _startTime,
        //         _endTime
        //     );

        //     // admin approve for auction
        //     await _auctionNFTContract.connect(_deployer).approveAuction(2, 1);
        //     // let infoAuction = await _auctionNFTContract.auctions(2);
        //     // console.log(infoAuction.auctionData.collectionAddress.toString(), "collectionAddress");
        //     // console.log(infoAuction.auctionData.owner.toString(), "owner");
        //     // console.log(infoAuction.auctionData.startingPrice.toString(), "startingPrice");
        //     // console.log(infoAuction.auctionData.buyOutPrice.toString(), "buyOutPrice");
        //     // console.log(infoAuction.auctionData.priceStep.toString(), "priceStep");
        //     // console.log(infoAuction.bidValue.toString(), "currentBidPrice");
        //     // console.log(infoAuction.winner.toString(), "winner");
        //     // console.log(infoAuction.auctionData.currency.toString(), "currency");
        //     // console.log(infoAuction.auctionData.startTime.toString(), "startTime");
        //     // console.log(infoAuction.auctionData.endTime.toString(), "endTime");
        //     // console.log(infoAuction.status.toString(), "status");


        //     let balanceOfBid1BeforeTXT = await _tiaContract.balanceOf(_bid1.address);
        //     let balanceOfBid2BeforeBidTXT = await _tiaContract.balanceOf(_bid2.address);
        //     let balanceOfOriginCreatorBeforeTXT = await _tiaContract.balanceOf(_originCreator.address);
        //     let balanceOfFeeWalletBeforeTXT = await _tiaContract.balanceOf(_feeWallet.address);

        //     console.log("info of auction before bid value ===========================");
        //     console.log("balance of bid 1 - buyer before TXT ", balanceOfBid1BeforeTXT.toString());
        //     console.log("balance of bid 2 - seller before TXT ", balanceOfBid2BeforeBidTXT.toString());
        //     console.log("balance of origin creator before TXT ", balanceOfOriginCreatorBeforeTXT.toString());
        //     console.log("balance of fee wallet before TXT ", balanceOfFeeWalletBeforeTXT.toString());

        //     await time.increase(300);


        //     await _auctionNFTContract.connect(_bid2).bid(2, BigInt(10 * 10 ** 18));

        //     console.log("info of auction after bid value ===========================");

        //     let balanceOfBid1AfterTXT = await _tiaContract.balanceOf(_bid1.address);
        //     let balanceOfBid2AfterTXT = await _tiaContract.balanceOf(_bid2.address);
        //     let newOwner = await _DFYContract.ownerOf(0);
        //     let balanceOfOriginCreatorAfterTXT = await _tiaContract.balanceOf(_originCreator.address);
        //     let balanceOfFeeWalletAfterTXT = await _tiaContract.balanceOf(_feeWallet.address);

        //     console.log("balance of bid 1 - buyer after TXT  : ", balanceOfBid1AfterTXT.toString());
        //     console.log("balance of bid 2 - seller after TXT : ", balanceOfBid2AfterTXT.toString());
        //     console.log("balance of origin creator afer TXT : ", balanceOfOriginCreatorAfterTXT.toString());
        //     console.log("balance of fee market after TXT :", balanceOfFeeWalletAfterTXT.toString());

        //     // calculator 
        //     let infoAuction = await _auctionNFTContract.auctions(1);
        //     let marketFee = BigInt(infoAuction.auctionData.buyOutPrice) * BigInt(_marketFeeRate) / BigInt(_zoom * 100);
        //     let royaltyFee = BigInt(infoAuction.auctionData.buyOutPrice) * BigInt(_royaltyRateDFY) / BigInt(_zoom * 100);
        //     let amountPaidToSeller = BigInt(infoAuction.auctionData.buyOutPrice) - BigInt(marketFee) - BigInt(royaltyFee);

        //     expect(balanceOfBid2BeforeBidTXT).to.equal(BigInt(balanceOfBid2AfterTXT) + BigInt(infoAuction.auctionData.buyOutPrice));
        //     expect(balanceOfBid1BeforeTXT).to.equal(BigInt(balanceOfBid1AfterTXT) - BigInt(amountPaidToSeller));
        //     expect(balanceOfFeeWalletBeforeTXT).to.equal(BigInt(balanceOfFeeWalletAfterTXT) - BigInt(marketFee));
        //     expect(newOwner === _bid2.address);
        // });

        // it("to test time not origin creator put on Auction, check bidder use BNB bid ", async () => {

        //     // safe mint and approve
        //     await _DFYContract.connect(_bid2).setApprovalForAll(_auctionNFTContract.address, true);

        //     let _startTime = Math.floor(Date.now() / 1000) + 1200 + 260;  // 2days
        //     let _endTime = _startTime + 60 + 10; // 2days + 12hour

        //     await _auctionNFTContract.connect(_bid2).putOnAuction(_firstToken,
        //         _DFYContract.address,
        //         _startingPrice,
        //         _buyOutPrice,
        //         _priceStep,
        //         BNB_ADDRESS,
        //         _startTime,
        //         _endTime
        //     );

        //     // admin approve for auction
        //     await _auctionNFTContract.connect(_deployer).approveAuction(3, 1);

        //     let balanceOfBid1BeforeTXT = await _bid1.getBalance();
        //     let balanceOfBid2BeforeBidTXT = await _bid2.getBalance();
        //     let balanceOfBid3BeforeBidTXT = await _bid3.getBalance();
        //     let balanceOfOriginCreatorBeforeTXT = await _originCreator.getBalance();
        //     let balanceOfFeeWalletBeforeTXT = await _feeWallet.getBalance();

        //     console.log("info of auction before bid value ===========================");
        //     console.log("balance of bid 1 - seller before TXT ", balanceOfBid1BeforeTXT.toString());
        //     console.log("balance of bid 2 - buyer before TXT ", balanceOfBid2BeforeBidTXT.toString());
        //     console.log("balance of origin creator before TXT ", balanceOfOriginCreatorBeforeTXT.toString());
        //     console.log("balance of fee wallet before TXT ", balanceOfFeeWalletBeforeTXT.toString());

        // await time.increase(420);
        // // buy out 
        // // await _auctionNFTContract.connect(_bid2).buyOut(2, { value: BigInt(10 * 10 ** 18) });
        // await _auctionNFTContract.connect(_bid2).bid(2, BigInt(1 * 10 ** 18), { value: BigInt(1 * 10 ** 18) });
        // await _auctionNFTContract.connect(_bid3).bid(2, BigInt(2 * 10 ** 18), { value: BigInt(1 * 10 ** 18) });



        // console.log("info of auction after bid value ===========================");

        // let iffo = await _auctionNFTContract.auctions(2);

        // console.log("bid value : ", iffo.bidValue.toString());
        // console.log("winner : ", iffo.winner.toString());
        // console.log("balance of origin creator before TXT ", balanceOfOriginCreatorBeforeTXT.toString());
        // console.log("balance of fee wallet before TXT ", balanceOfFeeWalletBeforeTXT.toString());

        // let balanceOfBid1AfterTXT = await _bid1.getBalance();
        // let balanceOfBid2AfterTXT = await _bid2.getBalance();
        // let balanceOfBid3AfterTXT = await _bid3.getBalance();
        // let newOwner = await _DFYContract.ownerOf(0);
        // let balanceOfOriginCreatorAfterTXT = await _originCreator.getBalance();
        // let balanceOfFeeWalletAfterTXT = await _feeWallet.getBalance();

        // // finish 
        // await time.increase(520);
        // let getOperatorRole = await _auctionNFTContract.OPERATOR_ROLE();
        // await _auctionNFTContract.connect(_deployer).grantRole(getOperatorRole, _bid1.address);

        // await _auctionNFTContract.connect(_bid1).finishAuction(2);

        // console.log("balance of bid 1 - seller after TXT  : ", balanceOfBid1AfterTXT.toString());
        // console.log("balance of bid 2 - buyer after TXT : ", balanceOfBid2AfterTXT.toString());
        // console.log("balance of bid 3 - buyer after TXT : ", balanceOfBid3AfterTXT.toString());
        // console.log("balance of origin creator afer TXT : ", balanceOfOriginCreatorAfterTXT.toString());
        // console.log("balance of fee market after TXT :", balanceOfFeeWalletAfterTXT.toString());

        // // calculator 
        // let infoAuction = await _auctionNFTContract.auctions(1);
        // let marketFee = BigInt(infoAuction.auctionData.buyOutPrice) * BigInt(_marketFeeRate) / BigInt(_zoom * 100);
        // console.log(marketFee.toString(), "market Fee");
        // let royaltyFee = BigInt(infoAuction.auctionData.buyOutPrice) * BigInt(_royaltyRateDFY) / BigInt(_zoom * 100);
        // console.log(royaltyFee.toString(), "royalty fee");
        // let amountPaidToSeller = BigInt(infoAuction.auctionData.buyOutPrice) - BigInt(marketFee) - BigInt(royaltyFee);
        // let feeGasBuy = BigInt(154552605590430);

        // console.log("fee gas ", feeGasBuy.toString());
        // console.log("buyOut  ", infoAuction.auctionData.buyOutPrice.toString());

        // console.log(amountPaidToSeller.toString(), "số tiền seller nhận được");

        // expect(balanceOfBid1BeforeTXT).to.equal(BigInt(balanceOfBid1AfterTXT) - BigInt(amountPaidToSeller));
        // expect(balanceOfBid2BeforeBidTXT).to.equal(BigInt(infoAuction.auctionData.buyOutPrice) + BigInt(balanceOfBid2AfterTXT) + BigInt(feeGasBuy));
        // expect(balanceOfFeeWalletBeforeTXT).to.equal(BigInt(balanceOfFeeWalletAfterTXT) - BigInt(marketFee));
        // expect(balanceOfOriginCreatorBeforeTXT).to.equal(BigInt(balanceOfOriginCreatorAfterTXT) - BigInt(royaltyFee));
        // expect(newOwner === _bid2.address);

        // });


        // it("To test Time not origin putOnAuction admin REJECTED auction ", async () => {

        //     await _DFYContract.connect(_bid2).setApprovalForAll(_auctionNFTContract.address, true);

        //     let _startTime = Math.floor(Date.now() / 1000) + 570 + 255; // 2d 
        //     let _endTime = _startTime + 70; // 7d

        //     await _auctionNFTContract.connect(_bid2).putOnAuction(_firstToken,
        //         _DFYContract.address,
        //         BigInt(1 * 10 ** 18),
        //         BigInt(10 * 10 ** 18),
        //         BigInt(1 * 10 ** 18),
        //         _DFYTokenContract.address,
        //         _startTime,
        //         _endTime
        //     );

        //     let getOperatorRole = await _auctionNFTContract.OPERATOR_ROLE();
        //     await _auctionNFTContract.connect(_deployer).grantRole(getOperatorRole, _deployer.address);

        //     // await _auctionNFTContract.connect(_deployer).cancelAuction(1);
        //     // await _auctionNFTContract.connect(_bid2).cancelAuction(1);

        //     // await time.increase(900);

        //     // let infoAuction = await _auctionNFTContract.auctions(1);
        //     // console.log(infoAuction.auctionData.collectionAddress.toString(), "collectionAddress");
        //     // console.log(infoAuction.auctionData.owner.toString(), "owner");
        //     // console.log(infoAuction.auctionData.startingPrice.toString(), "startingPrice");
        //     // console.log(infoAuction.auctionData.buyOutPrice.toString(), "buyOutPrice");
        //     // console.log(infoAuction.auctionData.priceStep.toString(), "priceStep");
        //     // console.log(infoAuction.bidValue.toString(), "currentBidPrice");
        //     // console.log(infoAuction.winner.toString(), "winner");
        //     // console.log(infoAuction.auctionData.currency.toString(), "currency");
        //     // console.log(infoAuction.auctionData.startTime.toString(), "startTime");
        //     // console.log(infoAuction.auctionData.endTime.toString(), "endTime");
        //     // console.log(infoAuction.status.toString(), "status");

        // });

    });
});