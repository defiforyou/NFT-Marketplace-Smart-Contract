const hre = require("hardhat");
const artifactDFYFactory = "DefiForYouNFTFactory";
const artifactDFYToken = "BEP20Token";
const artifactAuctionNFT = "AuctionNFT";
const artifactSellNFT = "SellNFT";
const artifactHub = "Hub";
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
            [_feeWalletHub.address, _feeToken.address, _deployer.address],
            { kind: "uups" }

        );
        _hubContract = await hubContract.deployed();
        console.log(_hubContract.address, "address hub contract : ");
        // set address token and address wallet 
        // await _hubContract.connect(_deployer).setSystemFeeToken(_DFYTokenContract.address);
        // await _hubContract.connect(_deployer).setSystemFeeWallet(_feeWallet.address);
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

        // DFY NFT
        // setContractHub
        await _DFYFactoryContract.connect(_deployer).setContractHub(_hubContract.address);
        let getContractHub = await _DFYFactoryContract.contractHub();
        console.log(getContractHub.toString(), "get contract hub :");
        console.log(_hubContract.address, "hub contract address :");

        // let getOperatorRole = await _hubContract.OPERATOR_ROLE();
        // await _DFYFactoryContract.connect(_deployer).grantRole(getOperatorRole, _originCreator.address);
        await _DFYFactoryContract.connect(_originCreator).createCollection(_tokenName, _symbol, 0, _cidOfCollection.toString());
        this.DFYNFTFactory = await hre.ethers.getContractFactory("DefiForYouNFT");
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

            let getOperatorRole = await _hubContract.OperatorRole();
            await _hubContract.connect(_deployer).grantRole(getOperatorRole, _adminApproveAuction.address);

            // admin approve for auction
            await _auctionNFTContract.connect(_adminApproveAuction).approveAuction(0, 1);

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
            let feeGasBuyOfBid1 = BigInt(82295540331156);
            let feeGasBuyOfBid2 = BigInt(72275032631934);

            expect(balanceOfBid1BeforeTXT).to.equal(BigInt(balanceOfBid1AfterTXT) + BigInt(feeGasBuyOfBid1));
            expect(balanceOfBid2BeforeBidTXT).to.equal(BigInt(balanceOfBid2AfterTXT) + BigInt(infoAuction.bidValue) + BigInt(feeGasBuyOfBid2));
            expect(balanceOfFeeWalletAfterTXT).to.equal(BigInt(balanceOfFeeWalletBeforeTXT) + BigInt(marketFee));
            expect(balanceOfOriginCreatorBeforeTXT).to.equal(BigInt(balanceOfOriginCreatorAfterTXT) - BigInt(amountPaidToSeller));
            expect(newOwner === _bid2.address);

        });

        it("To test Time not origin creator put on auction , check bidder bit use BEP20 bid to buyOut with royalty fee : ", async () => {

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

            let balanceOfBid1BeforeBidTXT = await _DFYTokenContract.balanceOf(_bid1.address);
            let balanceOfBid2BeforeBidTXT = await _DFYTokenContract.balanceOf(_bid2.address);
            let balanceOfBid3BeforeBidTXT = await _DFYTokenContract.balanceOf(_bid3.address);
            let balanceOfOriginCreatorBeforeTXT = await _DFYTokenContract.balanceOf(_originCreator.address);
            let balanceOfFeeWalletBeforeTXT = await _DFYTokenContract.balanceOf(_feeWallet.address);

            console.log("info of auction before bid value ===========================");
            console.log("balance of bid 1 before TXT ", balanceOfBid1BeforeBidTXT.toString());
            console.log("balance of bid 2 before TXT ", balanceOfBid2BeforeBidTXT.toString());
            console.log("balance of bid 3 before TXT ", balanceOfBid3BeforeBidTXT.toString());
            console.log("balance of origin creator before TXT", balanceOfOriginCreatorBeforeTXT.toString());
            console.log("balance of fee wallet before TXT ", balanceOfFeeWalletBeforeTXT.toString());

            // admin approve for auction
            await _auctionNFTContract.connect(_deployer).approveAuction(1, 1);

            await time.increase(590);
            await _auctionNFTContract.connect(_bid1).bid(1, BigInt(2 * 10 ** 18));
            await _auctionNFTContract.connect(_bid3).bid(1, BigInt(10 * 10 ** 18));

            console.log("info of auction after bid value ===========================");

            let balanceOfBid1AfterTXT = await _DFYTokenContract.balanceOf(_bid1.address);
            let balanceOfBid2AfterTXT = await _DFYTokenContract.balanceOf(_bid2.address);
            let balanceOfBid3AfterTXT = await _DFYTokenContract.balanceOf(_bid3.address);
            let newOwner = await _DFYContract.ownerOf(0);
            let balanceOfOriginCreatorAfterTXT = await _DFYTokenContract.balanceOf(_originCreator.address);
            let balanceOfFeeWalletAfterTXT = await _DFYTokenContract.balanceOf(_feeWallet.address);

            console.log("balance of bid 1 after TXT  : ", balanceOfBid1AfterTXT.toString());
            console.log("balance of bid2 after TXT :", balanceOfBid2AfterTXT.toString());
            console.log("balance of bid 3 after TXT  : ", balanceOfBid3AfterTXT.toString());
            console.log("balance of origin creator afer TXT : ", balanceOfOriginCreatorAfterTXT.toString());
            console.log("balance of fee market after TXT :", balanceOfFeeWalletAfterTXT.toString());

            // calculator 
            infoAuction = await _auctionNFTContract.auctions(1);
            let marketFee = BigInt(infoAuction.bidValue) * BigInt(_marketFeeRate) / BigInt(_zoom * 100);
            let royaltyFee = BigInt(infoAuction.bidValue) * BigInt(_royaltyRateDFY) / BigInt(_zoom * 100);
            let amountPaidToSeller = BigInt(infoAuction.bidValue) - BigInt(marketFee) - BigInt(royaltyFee);

            expect(balanceOfBid1BeforeBidTXT).to.equal(BigInt(balanceOfBid1AfterTXT));
            expect(balanceOfBid2BeforeBidTXT).to.equal(BigInt(balanceOfBid2AfterTXT) - BigInt(amountPaidToSeller));
            expect(balanceOfBid3BeforeBidTXT).to.equal(BigInt(balanceOfBid3AfterTXT) + BigInt(infoAuction.bidValue));
            expect(balanceOfFeeWalletAfterTXT).to.equal(BigInt(balanceOfFeeWalletBeforeTXT) + BigInt(marketFee));
            expect(balanceOfOriginCreatorBeforeTXT).to.equal(BigInt(balanceOfOriginCreatorAfterTXT) - BigInt(royaltyFee));
            expect(newOwner === _bid3.address);

        });

        it("To test Time not origin creator put on auction , check bidder use BEP20 to buyOut with royalty fee :", async () => {

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

            let balanceOfBid1BeforeBidTXT = await _DFYTokenContract.balanceOf(_bid1.address);
            let balanceOfBid2BeforeBidTXT = await _DFYTokenContract.balanceOf(_bid2.address);
            let balanceOfBid3BeforeBidTXT = await _DFYTokenContract.balanceOf(_bid3.address);
            let balanceOfOriginCreatorBeforeTXT = await _DFYTokenContract.balanceOf(_originCreator.address);
            let balanceOfFeeWalletBeforeTXT = await _DFYTokenContract.balanceOf(_feeWallet.address);

            console.log("info of auction before bid value ===========================");
            console.log("balance of bid 1 before TXT ", balanceOfBid1BeforeBidTXT.toString());
            console.log("balance of bid 2 before TXT ", balanceOfBid2BeforeBidTXT.toString());
            console.log("balance of bid 3 before TXT ", balanceOfBid3BeforeBidTXT.toString());
            console.log("balance of origin creator before TXT", balanceOfOriginCreatorBeforeTXT.toString());
            console.log("balance of fee wallet before TXT ", balanceOfFeeWalletBeforeTXT.toString());

            await time.increase(350);
            await _auctionNFTContract.connect(_bid1).bid(2, BigInt(2 * 10 ** 18));
            await _auctionNFTContract.connect(_bid2).buyOut(2);

            console.log("info of auction after bid value ===========================");

            let balanceOfBid1AfterTXT = await _DFYTokenContract.balanceOf(_bid1.address);
            let balanceOfBid2AfterTXT = await _DFYTokenContract.balanceOf(_bid2.address);
            let balanceOfBid3AfterTXT = await _DFYTokenContract.balanceOf(_bid3.address);
            let newOwner = await _DFYContract.ownerOf(0);
            let balanceOfOriginCreatorAfterTXT = await _DFYTokenContract.balanceOf(_originCreator.address);
            let balanceOfFeeWalletAfterTXT = await _DFYTokenContract.balanceOf(_feeWallet.address);

            console.log("balance of bid 1 after TXT  : ", balanceOfBid1AfterTXT.toString());
            console.log("balance of bid2 after TXT :", balanceOfBid2AfterTXT.toString());
            console.log("balance of bid 3 after TXT  : ", balanceOfBid3AfterTXT.toString());
            console.log("balance of origin creator afer TXT : ", balanceOfOriginCreatorAfterTXT.toString());
            console.log("balance of fee market after TXT :", balanceOfFeeWalletAfterTXT.toString());

            // calculator 
            infoAuction = await _auctionNFTContract.auctions(2);
            let marketFee = BigInt(infoAuction.bidValue) * BigInt(_marketFeeRate) / BigInt(_zoom * 100);
            let royaltyFee = BigInt(infoAuction.bidValue) * BigInt(_royaltyRateDFY) / BigInt(_zoom * 100);
            let amountPaidToSeller = BigInt(infoAuction.bidValue) - BigInt(marketFee) - BigInt(royaltyFee);

            expect(balanceOfBid1BeforeBidTXT).to.equal(BigInt(balanceOfBid1AfterTXT)); // bid 1 bid 
            expect(balanceOfBid2BeforeBidTXT).to.equal(BigInt(balanceOfBid2AfterTXT) + BigInt(infoAuction.auctionData.buyOutPrice)); // bid 2 buyer 
            expect(balanceOfBid3BeforeBidTXT).to.equal(BigInt(balanceOfBid3AfterTXT) - BigInt(amountPaidToSeller)); // bid 3 seller 
            expect(balanceOfFeeWalletAfterTXT).to.equal(BigInt(balanceOfFeeWalletBeforeTXT) + BigInt(marketFee));
            expect(balanceOfOriginCreatorBeforeTXT).to.equal(BigInt(balanceOfOriginCreatorAfterTXT) - BigInt(royaltyFee)); // origin creator
            expect(newOwner === _bid2.address);

        });

        it("To test Time not origin creator put on auction admin reject auction ", async () => {

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
            await _auctionNFTContract.connect(_deployer).approveAuction(3, 2);

            let infoAuction = await _auctionNFTContract.auctions(3);
            // 2 is REJECTED
            expect(infoAuction.status).to.equal(2);

        });

        it("To test Time not origin creator put on auction owner auction self cancel listing", async () => {

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

            await _auctionNFTContract.connect(_bid2).cancelAuction(4);

            let infoAuction = await _auctionNFTContract.auctions(4);
            // 4 is CANCELLED
            expect(infoAuction.status).to.equal(4);

        });

    });
});