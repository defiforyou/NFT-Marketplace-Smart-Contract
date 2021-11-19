const hre = require("hardhat");
const artifactDFYFactory = "DefiForYouNFTFactory";
const artifactDFY = "DefiForYouNFT";
const artifactTia = "TiaToken";
const artifactDFYToken = "BEP20Token";
const artifactAuctionNFT = "AuctionNFT";
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

    let _tokenName = "DefiForYou";
    let _symbol = "DFY-NFT";
    let _royaltyRateFactory = 2000;
    let _royaltyRateDFY = 10 * 10 ** 5;
    let _zoom = 1e5;
    let _royaltyFee = 10 * 10 ** 5;
    let _marketFeeRate = 2.5 * 10 ** 5; // 2,5 % 
    let _startingPrice = BigInt(1 * 10 ** 18);
    let _buyOutPrice = BigInt(10 * 10 ** 18);
    let _priceStep = BigInt(1 * 10 ** 18);
    let _cidOfCollection = "QmZfey7KWSZwwkU4DeBch6jsXSjdNp2UYYhVq4RZYPGr4Z";
    let _cidOfNFT = "QmbDE5EDoiGAYLTQzmftDx96L4UDMT6Ra2km5HqtU89JWn";
    let _feeCreateCollection = 1000;
    let _collectionURI = "https://defiforyou.mypinata.cloud/ipfs/";
    let _contractURI = "https://defiforyou.mypinata.cloud/ipfs/QmZfey7KWSZwwkU4DeBch6jsXSjdNp2UYYhVq4RZYPGr4Z";
    let _firstToken = 0;
    let _secondToken = 1;
    let _thirdToken = 2;
    let _fourthToken = 3;

    before(async () => {
        [
            _deployer,
            _originCreator,
            _originCreator,
            _bid1,
            _bid2,
            _feeWallet

        ] = await ethers.getSigners();
        // DFY Factory 
        const DFYFactory = await hre.ethers.getContractFactory(artifactDFYFactory);
        const DFYFactoryContract = await hre.upgrades.deployProxy(
            DFYFactory,
            { kind: "uups" }
        );
        _DFYFactoryContract = await DFYFactoryContract.deployed();
        console.log(_DFYFactoryContract.address, "address DFY Factory contract : ");

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

        // Auction NFT 
        const auctionNFTFactory = await hre.ethers.getContractFactory(artifactAuctionNFT);
        const auctionNFTContract = await hre.upgrades.deployProxy(
            auctionNFTFactory,
            [_zoom],
            { kind: "uups" }

        );
        _auctionNFTContract = await auctionNFTContract.deployed();
        console.log(_auctionNFTContract.address, "address SellNFT contract : ");

        // DFY NFT
        let getOperatorRole = await _DFYFactoryContract.OPERATOR_ROLE();
        await _DFYFactoryContract.connect(_deployer).grantRole(getOperatorRole, _originCreator.address);
        await _DFYFactoryContract.connect(_originCreator).createCollection(_tokenName, _symbol, 0, _cidOfCollection.toString());
        this.DFYNFTFactory = await hre.ethers.getContractFactory("DefiForYouNFT");
        let getAddressContractOfCreatetor = await _DFYFactoryContract.collectionsByOwner(_originCreator.address, 0);
        _DFYContract = this.DFYNFTFactory.attach(getAddressContractOfCreatetor);

    });

    describe("unit test DFY ", async () => {

        // todo: origin creator with market fee and use bep 20 
        // todo : != origin creator with marketFee and royaltyFee use erc20 
        // todo : != origin creator with marketFee and royaltyFee use BNB 

        it("origin creator put on Auction bid use bep 20 with no royalty Fee", async () => {

            // DFY Token air drop  
            await _DFYTokenContract.connect(_deployer).transfer(_bid1.address, BigInt(20 * 10 ** 18));
            await _DFYTokenContract.transfer(_bid2.address, BigInt(20 * 10 ** 18));
            await _DFYTokenContract.connect(_bid1).approve(_auctionNFTContract.address, BigInt(20 * 10 ** 18));
            await _DFYTokenContract.connect(_bid2).approve(_auctionNFTContract.address, BigInt(20 * 10 ** 18));


            // set feeWallet and marketFee Rate 
            await _auctionNFTContract.connect(_deployer).setFeeWallet(_feeWallet.address);
            await _auctionNFTContract.connect(_deployer).setMarketFeeRate(_marketFeeRate);

            // safe mint and approve 
            await _DFYContract.connect(_originCreator).safeMint(_originCreator.address, 0, _cidOfNFT);
            await _DFYContract.connect(_originCreator).approve(_auctionNFTContract.address, _firstToken);

            let ownerOfFistToken = await _DFYContract.ownerOf(_firstToken);
            console.log(ownerOfFistToken, "owner ");
            console.log(_originCreator.address, "origin creator ");
            // put on auction 
            // calculator : 60 = 1m / 3600 = 1h / 86400 = 24h 

            let _startTime = Math.floor(Date.now() / 1000) + 172850; // 2days
            let _endTime = Math.floor(Date.now() / 1000) + 172850 + 43300; // 2days + 12hour

            // require start time > 2 days tính từ block.time clear
            // require end time > start time + 12 tiếng clear 
            // require duration maximum 7 days => end time > start time + 5 days clear

            await _auctionNFTContract.connect(_originCreator).putOnAuction(_firstToken,
                _DFYContract.address,
                _startingPrice,
                _buyOutPrice,
                _priceStep,
                _DFYTokenContract.address,
                _startTime,
                _endTime
            );

            // admin approve auction 

            _auctionNFTContract.approveAuction(0, true);

            await time.increase();


            // let infoAuction = await _auctionNFTContract.auctions(0);







        });

    });
});