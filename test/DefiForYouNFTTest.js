const hre = require("hardhat");
const artifactDFYFactory = "DefiForYouNFTFactory";
const artifactDFY = "DefiForYouNFT";
const { expect } = require("chai");
const decimals = 10 ** 18;

describe("Deploy DFY Factory", (done) => {

    let _DFYFactoryContract = null;
    let _DFYContract = null;

    let _tokenName = "DefiForYou";
    let _symbol = "DFY-NFT";
    let _royaltyRate = 2000;
    let _royaltyRateDFY = 3000;
    let _cidOfCollection = "QmZfey7KWSZwwkU4DeBch6jsXSjdNp2UYYhVq4RZYPGr4Z";
    let _cidOfNFT = "QmbDE5EDoiGAYLTQzmftDx96L4UDMT6Ra2km5HqtU89JWn";
    let _feeCreateCollection = 1000;
    let _addressBNB = "0x0000000000000000000000000000000000000000";
    let _addressETH = "0xf827916F754297d7fF595e77c8dF8287fDE74BA4";
    let _collectionURI = "https://defiforyou.mypinata.cloud/ipfs/";
    let _contractURI = "https://defiforyou.mypinata.cloud/ipfs/QmZfey7KWSZwwkU4DeBch6jsXSjdNp2UYYhVq4RZYPGr4Z";

    let _firstToken = 0;
    let _secondToken = 1;


    before(async () => {
        [
            _deployer,
            _creator,
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
    });

    describe("unit test DFY ", async () => {

        it("set Fee Wallet and create Collection ", async () => {
            // set address fee wallet 
            await _DFYFactoryContract.connect(_deployer).setFeeWallet(_feeWallet.address);
            let feeWallet = await _DFYFactoryContract.feeWallet();

            // set collection create fee 
            await _DFYFactoryContract.connect(_deployer).setCollectionCreatingFee(_feeCreateCollection);
            let collectionCreatingFee = await _DFYFactoryContract.collectionCreatingFee();

            // set address token pay fee when create collection
            await _DFYFactoryContract.connect(_deployer).setWhitelistedFeeToken(_addressBNB.toString(), true);
            let checkWLFT = await _DFYFactoryContract.whitelistedFeeTokens(_addressBNB.toString());

            // grant role for creator 
            let getOperatorRole = await _DFYFactoryContract.OPERATOR_ROLE();
            await _DFYFactoryContract.connect(_deployer).grantRole(getOperatorRole, _creator.address);

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
            let collectionURI = await _DFYContract.CollectionURI();
            let contractURI = await _DFYContract.contractURI();
            let defaultRoyaltyRate = await _DFYContract.defaultRoyaltyRate();
            let factory = await _DFYContract.factory();
            let royaltyRateNFT = await _DFYContract.royaltyRateByToken(_firstToken);
            let defaultRoyalty = await _DFYContract.defaultRoyaltyRate();

            console.log("deployer :", ((await _deployer.getBalance() / decimals)).toString());
            console.log("creator", ((await _creator.getBalance() / decimals)).toString());
            console.log("feeWallet", ((await _feeWallet.getBalance() / decimals)).toString());

            expect(feeWallet.toString()).to.equal(_feeWallet.address); // check set fee wallet 
            expect(checkWLFT === true); // check set white listed fee token 
            expect(collectionCreatingFee).to.equal(_feeCreateCollection)// check collection creating fee 
            expect(checkAdminRoleOfCreator === true)// check Admin role of creator
            expect(checkMinterRoleOfCreator === true); // check minter role 
            expect(tokenOf.toString()).to.equal(_creator.address); // check owner of token
            expect(name.toString()).to.equal(_tokenName); // compare token name 
            expect(symbol.toString()).to.equal(_symbol); // symbol
            expect(collectionCID.toString()).to.equal(_cidOfCollection.toString()); // collectionCID 
            expect(collectionURI.toString()).to.equal(_collectionURI); // collectionURI
            expect(contractURI.toString()).to.equal(_contractURI); // contract URI
            expect(defaultRoyaltyRate).to.equal(_royaltyRate); // royalty 
            expect(factory.toString()).to.equal(_DFYFactoryContract.address); // factory
            expect(_royaltyRateDFY).to.equal(royaltyRateNFT); // royaltyRate NFT
            expect(defaultRoyaltyRate).to.equal(_royaltyRate); // royaltyRate Factory
        });
    });
});
