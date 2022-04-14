const hre = require("hardhat");
const artifactDFYFactory = "DefiForYouNFTFactory";
const artifactDFYNFT = "contracts/dfy-nft/DefiForYouNFT.sol:DefiForYouNFT";
const artifactHub = "Hub";
const artifactDFYToken = "DFY";
const { expect } = require("chai");
const decimals = 10 ** 18;

describe("Deploy DFY Factory", (done) => {

    let _DFYFactoryContract = null;
    let _DFYContract = null;
    let _DFYTokenContract = null;
    let _hubContract = null;
    let _tokenName = "DefiForYou";
    let _symbol = "DFY-NFT";
    let _tokenName2 = "DefiForYou Test2";
    let _symbol2 = "DFY-NFT Test2";
    let _defaultRoyaltyRate = 3 * 10 ** 5;
    let _newRoyaltyRateDFY = 5 * 10 ** 5;
    let _zoom = 1e5;
    let _tokenCID = "EXAMPLE";
    let _collectionCID = "QmZfey7KWSZwwkU4DeBch6jsXSjdNp2UYYhVq4RZYPGr4Z";
    let _cidOfNFT = "QmbDE5EDoiGAYLTQzmftDx96L4UDMT6Ra2km5HqtU89JWn";
    let _contractURI = "https://defiforyou.mypinata.cloud/ipfs/QmZfey7KWSZwwkU4DeBch6jsXSjdNp2UYYhVq4RZYPGr4Z";

    const CollectionStatus = {
        OPEN: 0
    };

    before(async () => {
        [
            _deployer,
            _creator,
            _feeWalletHub,
            _feeToken,

        ] = await ethers.getSigners();

        // DFY Token 
        const dFYTokenFactory = await hre.ethers.getContractFactory(artifactDFYToken);
        const dfyContract = await dFYTokenFactory.deploy();
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
        let getDFYFactorySignature = await _DFYFactoryContract.signature();
        await _hubContract.registerContract(getDFYFactorySignature, _DFYFactoryContract.address, artifactDFYFactory)
    });

    describe("unit test DFY ", async () => {

        it("Case 1 : Customer create collection with no creating fee and mint nft with no minting fee", async () => {

            await _DFYTokenContract.connect(_deployer).transfer(_creator.address, BigInt(20 * 10 ** 18));
            await _DFYTokenContract.connect(_creator).approve(_DFYFactoryContract.address, BigInt(20 * 10 ** 18));
            // setSystemConfig 
            await _hubContract.connect(_deployer).setSystemConfig(_feeWalletHub.address, _DFYTokenContract.address);

            let balanceOfCreatorBeforeCreateCollection = await _DFYTokenContract.balanceOf(_creator.address) / decimals;
            let balanceOfFeeWalletBefeoreCreateCollection = await _DFYTokenContract.balanceOf(_feeWalletHub.address) / decimals;
            console.log(`\x1b[36m Before Create collection \x1b[0m`);
            console.log("creator before :", balanceOfCreatorBeforeCreateCollection.toString());
            console.log("fee wallet before :", balanceOfFeeWalletBefeoreCreateCollection.toString());

            // create collection 
            let getEventCreateCollection = await _DFYFactoryContract.connect(_creator).createCollection(_tokenName, _symbol, _defaultRoyaltyRate, _collectionCID.toString());
            let reciptEventCreateCollection = await getEventCreateCollection.wait();

            console.log(`\x1b[31m event creator create collection : \x1b[0m`);
            console.log(reciptEventCreateCollection.events[2]);
            expect(reciptEventCreateCollection.events[2].args[6]).to.equal(CollectionStatus.OPEN);

            this.DFYNFTFactory = await hre.ethers.getContractFactory(artifactDFYNFT);
            let getAddressContractOfCreatetor = await _DFYFactoryContract.collectionsByOwner(_creator.address, 0);
            _DFYContract = this.DFYNFTFactory.attach(getAddressContractOfCreatetor);

            // check creating fee 
            let balanceOfCreatorAfterCreateCollection = await _DFYTokenContract.balanceOf(_creator.address) / decimals;
            let balanceOfFeeWalletAfterCreateCollection = await _DFYTokenContract.balanceOf(_feeWalletHub.address) / decimals;
            console.log(`\x1b[36m After Create collection \x1b[0m`);
            console.log("creator after :", balanceOfCreatorAfterCreateCollection.toString());
            console.log("fee wallet after :", balanceOfFeeWalletAfterCreateCollection.toString());

            // khẳng định customer tạo collection không mất minting fee
            expect(balanceOfCreatorBeforeCreateCollection).to.equal(balanceOfCreatorAfterCreateCollection);
            expect(balanceOfFeeWalletBefeoreCreateCollection).to.equal(balanceOfFeeWalletAfterCreateCollection);

            // check contract collection of creator 
            let collectionByOwner = await _DFYFactoryContract.collectionsByOwner(_creator.address, 0); // return address contract collection of creator 
            expect(collectionByOwner.toString()).to.equal(_DFYContract.address);

            // minter role 
            let getMinterRole = await _DFYContract.MINTER_ROLE();
            let checkMinterRoller = await _DFYContract.hasRole(getMinterRole, _creator.address);
            expect(checkMinterRoller).to.equal(true);

            // factory 
            let getFactory = await _DFYContract.factory();
            console.log(getFactory);
            expect(getFactory).to.equal(_DFYFactoryContract.address);

            // check info of collection 
            let tokenName = await _DFYContract.name();
            let symbol = await _DFYContract.symbol();
            let collectionCID = await _DFYContract.collectionCID();
            let defaultRoyaltyRate = await _DFYContract.defaultRoyaltyRate();

            expect(_tokenName).to.equal(tokenName);
            expect(_symbol).to.equal(symbol);
            expect(_collectionCID).to.equal(collectionCID);
            expect(_defaultRoyaltyRate).to.equal(defaultRoyaltyRate);

            let balanceOfCreatorBeforeMintNFT = await _DFYTokenContract.balanceOf(_creator.address) / decimals;
            let balanceOfFeeWalletBeforeMintNFT = await _DFYTokenContract.balanceOf(_feeWalletHub.address) / decimals;

            console.log(`\x1b[36m balance before creator mintNFT : \x1b[0m`);
            console.log("creator : ", balanceOfCreatorBeforeMintNFT);
            console.log("fee Wallet :", balanceOfFeeWalletBeforeMintNFT);

            // mintNFT
            await _DFYTokenContract.connect(_creator).approve(_DFYContract.address, BigInt(10 * 10 ** 18));
            let getEventMintNFT = await _DFYContract.connect(_creator).safeMint(_creator.address, _defaultRoyaltyRate, _tokenCID);
            let reciptEventMintNFT = await getEventMintNFT.wait();
            console.log(`\x1b[31m event creator mintNFT : \x1b[0m`);
            console.log(reciptEventMintNFT.events[3]);

            let balanceOfCreatorAfterMintNFT = await _DFYTokenContract.balanceOf(_creator.address) / decimals;
            let balanceOfFeeWalletAfterMintNFT = await _DFYTokenContract.balanceOf(_feeWalletHub.address) / decimals;
            console.log(`\x1b[36m balance after creator mintNFT : \x1b[0m`);
            console.log("creator : ", balanceOfCreatorAfterMintNFT);
            console.log("fee Wallet :", balanceOfFeeWalletAfterMintNFT);

            // customer mintNFT không mất mintingfee
            expect(balanceOfCreatorBeforeMintNFT).to.equal(balanceOfCreatorAfterMintNFT);

            let getDFYFactorySignature = await _DFYFactoryContract.signature();
            let checkContractRegistry = await _hubContract.ContractRegistry(getDFYFactorySignature);
            console.log(checkContractRegistry.toString());
        });

        it("Case 2 : Customer create collection has mintingfee and mintNFT with default royalty fee ", async () => {

            // setMintingFee 
            await _hubContract.connect(_deployer).setNFTConfiguration(BigInt(1 * 10 ** 18), BigInt(2 * 10 ** 18));

            let balanceOfCreatorBeforeCreateCollection = await _DFYTokenContract.balanceOf(_creator.address) / decimals;
            let balanceOfFeeWalletBefeoreCreateCollection = await _DFYTokenContract.balanceOf(_feeWalletHub.address) / decimals;
            console.log(`\x1b[36m Before Create collection \x1b[0m`);
            console.log("creator before :", balanceOfCreatorBeforeCreateCollection.toString());
            console.log("fee wallet before :", balanceOfFeeWalletBefeoreCreateCollection.toString());

            // create collection 
            let getEventCreateCollection = await _DFYFactoryContract.connect(_creator).createCollection(_tokenName2, _symbol2, _defaultRoyaltyRate, _collectionCID.toString());
            let reciptEventCreateCollection = await getEventCreateCollection.wait();

            console.log(reciptEventCreateCollection.events);

            console.log(`\x1b[31m event creator create collection : \x1b[0m`);
            console.log(reciptEventCreateCollection.events[4]);
            expect(reciptEventCreateCollection.events[4].args[6]).to.equal(CollectionStatus.OPEN);

            this.DFYNFTFactory = await hre.ethers.getContractFactory(artifactDFYNFT);
            let getAddressContractOfCreatetor = await _DFYFactoryContract.collectionsByOwner(_creator.address, 1);
            _DFYContract = this.DFYNFTFactory.attach(getAddressContractOfCreatetor);

            // check creating fee 
            let balanceOfCreatorAfterCreateCollection = await _DFYTokenContract.balanceOf(_creator.address) / decimals;
            let balanceOfFeeWalletAfterCreateCollection = await _DFYTokenContract.balanceOf(_feeWalletHub.address) / decimals;
            console.log(`\x1b[36m After Create collection \x1b[0m`);
            console.log("creator after :", balanceOfCreatorAfterCreateCollection.toString());
            console.log("fee wallet after :", balanceOfFeeWalletAfterCreateCollection.toString());

            let collectionCreatingFee = balanceOfCreatorBeforeCreateCollection - balanceOfCreatorAfterCreateCollection;
            expect(balanceOfCreatorBeforeCreateCollection).to.equal(balanceOfCreatorAfterCreateCollection + collectionCreatingFee);

            // check contract collection of creator 
            let collectionByOwner = await _DFYFactoryContract.collectionsByOwner(_creator.address, 1); // return address contract collection of creator 
            expect(collectionByOwner.toString()).to.equal(_DFYContract.address);

            // minter role 
            let getMinterRole = await _DFYContract.MINTER_ROLE();
            let checkMinterRoller = await _DFYContract.hasRole(getMinterRole, _creator.address);
            expect(checkMinterRoller).to.equal(true);

            // factory 
            let getFactory = await _DFYContract.factory();
            console.log(getFactory);
            expect(getFactory).to.equal(_DFYFactoryContract.address);

            // check info of collection 
            let tokenName = await _DFYContract.name();
            let symbol = await _DFYContract.symbol();
            let collectionCID = await _DFYContract.collectionCID();
            let defaultRoyaltyRate = await _DFYContract.defaultRoyaltyRate();

            expect(_tokenName2).to.equal(tokenName);
            expect(_symbol2).to.equal(symbol);
            expect(_collectionCID).to.equal(collectionCID);
            expect(_defaultRoyaltyRate).to.equal(defaultRoyaltyRate);

            let balanceOfCreatorBeforeMintNFT = await _DFYTokenContract.balanceOf(_creator.address) / decimals;
            let balanceOfFeeWalletBeforeMintNFT = await _DFYTokenContract.balanceOf(_feeWalletHub.address) / decimals;

            console.log(`\x1b[36m balance before creator mintNFT : \x1b[0m`);
            console.log("creator : ", balanceOfCreatorBeforeMintNFT);
            console.log("fee Wallet :", balanceOfFeeWalletBeforeMintNFT);

            // mintNFT
            await _DFYTokenContract.connect(_creator).approve(_DFYContract.address, BigInt(10 * 10 ** 18));
            let getEventMintNFT = await _DFYContract.connect(_creator).safeMint(_creator.address, _defaultRoyaltyRate, _tokenCID);
            let reciptEventMintNFT = await getEventMintNFT.wait();
            console.log(`\x1b[31m event creator mintNFT : \x1b[0m`);
            console.log(reciptEventMintNFT.events[3]);

            let balanceOfCreatorAfterMintNFT = await _DFYTokenContract.balanceOf(_creator.address) / decimals;
            let balanceOfFeeWalletAfterMintNFT = await _DFYTokenContract.balanceOf(_feeWalletHub.address) / decimals;
            console.log(`\x1b[36m balance after creator mintNFT : \x1b[0m`);
            console.log("creator : ", balanceOfCreatorAfterMintNFT);
            console.log("fee Wallet :", balanceOfFeeWalletAfterMintNFT);

            let mintingFee = balanceOfCreatorBeforeMintNFT - balanceOfCreatorAfterMintNFT;
            expect(balanceOfCreatorBeforeMintNFT).to.equal(balanceOfCreatorAfterMintNFT + mintingFee);

            let getDFYFactorySignature = await _DFYFactoryContract.signature();
            let checkContractRegistry = await _hubContract.ContractRegistry(getDFYFactorySignature);
            console.log(checkContractRegistry.toString());
        });

    });
});
