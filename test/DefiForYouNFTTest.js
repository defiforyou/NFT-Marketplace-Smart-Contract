const hre = require("hardhat");
const artifactDFYFactory = "DefiForYouNFTFactory";
const artifactHub = "Hub";
const artifactDFYToken = "BEP20Token";
const { expect } = require("chai");
const decimals = 10 ** 18;

describe("Deploy DFY Factory", (done) => {

    let _DFYFactoryContract = null;
    let _DFYContract = null;
    let _DFYTokenContract = null;
    let _hubContract = null;

    let _tokenName = "DefiForYou";
    let _symbol = "DFY-NFT";
    let _royaltyRate = 2000;
    let _royaltyRateDFY = 3000;
    let _cidOfCollection = "QmZfey7KWSZwwkU4DeBch6jsXSjdNp2UYYhVq4RZYPGr4Z";
    let _cidOfNFT = "QmbDE5EDoiGAYLTQzmftDx96L4UDMT6Ra2km5HqtU89JWn";
    let _contractURI = "https://defiforyou.mypinata.cloud/ipfs/QmZfey7KWSZwwkU4DeBch6jsXSjdNp2UYYhVq4RZYPGr4Z";
    let _firstToken = 0;


    before(async () => {
        [
            _deployer,
            _creator,
            _feeWalletHub,
            _feeToken,
            _marketFeeWallet

        ] = await ethers.getSigners();

        // DFY Token 
        const dFYTokenFactory = await hre.ethers.getContractFactory(artifactDFYToken);
        const dfyContract = await dFYTokenFactory.deploy(
            "DFY-Token",
            "DFY",
            BigInt(1000000000000000000000)
        );
        _DFYTokenContract = await dfyContract.deployed();

        // contractHub 
        const hubContractFactory = await hre.ethers.getContractFactory(artifactHub);
        const hubContract = await hre.upgrades.deployProxy(
            hubContractFactory,
            [_feeWalletHub.address, _DFYTokenContract.address, _deployer.address],
            { kind: "uups" }

        );
        _hubContract = await hubContract.deployed();
        console.log(_hubContract.address, "address hub contract : ");

        // DFY Factory 
        const DFYFactory = await hre.ethers.getContractFactory(artifactDFYFactory);
        const DFYFactoryContract = await hre.upgrades.deployProxy(
            DFYFactory,
            [_hubContract.address],
            { kind: "uups" }
        );
        _DFYFactoryContract = await DFYFactoryContract.deployed();
        console.log(_DFYFactoryContract.address, "address DFY Factory contract : ");

    });

    describe("unit test DFY ", async () => {

        it("set Fee Wallet and create Collection ", async () => {

            // create collection 
            await _DFYFactoryContract.connect(_creator).createCollection(_tokenName, _symbol, _royaltyRate, _cidOfCollection.toString()); // create collection 
            this.DFYNFTFactory = await hre.ethers.getContractFactory("DefiForYouNFT"); // contract name
            let getAddressContractOfCreatetor = await _DFYFactoryContract.collectionsByOwner(_creator.address, 0);
            _DFYContract = this.DFYNFTFactory.attach(getAddressContractOfCreatetor);
            console.log(getAddressContractOfCreatetor.toString(), "address DFY contract : ")

            // DFY NFT 
            let defaultAdminRole = await _DFYContract.DEFAULT_ADMIN_ROLE();
            let minterRole = await _DFYContract.MINTER_ROLE();

            let checkAdminRoleOfCreator = await _DFYContract.hasRole(defaultAdminRole, _creator.address);
            let checkMinterRoleOfCreator = await _DFYContract.hasRole(minterRole, _creator.address);

            // mint NFT 
            await _DFYContract.connect(_creator).safeMint(_creator.address, _royaltyRateDFY, _cidOfNFT);
            let tokenOf = await _DFYContract.ownerOf(_firstToken);

            let name = await _DFYContract.name();
            let symbol = await _DFYContract.symbol();
            let collectionCID = await _DFYContract.collectionCID();
            let contractURI = await _DFYContract.contractURI();
            let defaultRoyaltyRate = await _DFYContract.defaultRoyaltyRate();
            let factory = await _DFYContract.factory();
            let royaltyRateNFT = await _DFYContract.royaltyRateByToken(_firstToken);
            let defaultRoyalty = await _DFYContract.defaultRoyaltyRate();
            let systemConfig = await _hubContract.systemConfig();

            expect(systemConfig[1]).to.equal(_DFYTokenContract.address); // check hub contract setSystemFeeToken
            expect(systemConfig[0]).to.equal(_feeWalletHub.address)// check hub contract setSystemFeeWallet
            expect(checkAdminRoleOfCreator === true)// check Admin role of creator
            expect(checkMinterRoleOfCreator === true); // check minter role 
            expect(tokenOf.toString()).to.equal(_creator.address); // check owner of token
            expect(name.toString()).to.equal(_tokenName); // compare token name 
            expect(symbol.toString()).to.equal(_symbol); // symbol
            expect(collectionCID.toString()).to.equal(_cidOfCollection.toString()); // collectionCID 
            expect(contractURI.toString()).to.equal(_contractURI); // contract URI
            expect(defaultRoyaltyRate).to.equal(_royaltyRate); // royalty 
            expect(factory.toString()).to.equal(_DFYFactoryContract.address); // factory
            expect(_royaltyRateDFY).to.equal(royaltyRateNFT); // royaltyRate NFT
            expect(defaultRoyalty).to.equal(_royaltyRate); // royaltyRate Factory


            // anh hoàng anh chưa triển khai phần tính phí khi tạo collection 
        });
    });
});
