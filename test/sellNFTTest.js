const hre = require("hardhat");
const { expect, assert } = require("chai");
const artifactDFYToken = "contracts/BEP20Token.sol:BEP20Token";
const artifactDFYFactory = "DefiForYouNFTFactory";
const artifactDFYToken = "DFY";
const artifactSellNFT = "SellNFT";
const artifactHub = "Hub";
const artfactDFYNFT = "contracts/dfy-nft/DefiForYouNFT.sol:DefiForYouNFT";
const BNB_ADDRESS = "0x0000000000000000000000000000000000000000";
const decimals = 10 ** 18;


describe("Deploy DFY Factory", (done) => {

    let _DFYFactoryContract = null;
    let _DFYContract = null;
    let _sellNFTContract = null;
    let _DFYTokenContract = null;
    let _hubContract = null;

    let _tokenName = "DefiForYou";
    let _symbol = "DFY-NFT";
    let _royaltyRateDFY = 10 * 10 ** 5;
    let _zoom = 1e5;
    let _marketFeeRate = 2.5 * 10 ** 5; // 2,5 % 
    let _price = BigInt(1 * 10 ** 18);
    let _price2 = BigInt(2 * 10 ** 18);
    let _cidOfCollection = "QmZfey7KWSZwwkU4DeBch6jsXSjdNp2UYYhVq4RZYPGr4Z";
    let _cidOfNFT = "QmbDE5EDoiGAYLTQzmftDx96L4UDMT6Ra2km5HqtU89JWn";
    let _firstToken = 0;
    let _secondToken = 1;
    let _thirdToken = 2;
    let _fourthToken = 3;

    before(async () => {
        [
            _deployer,
            _originCreator,
            _buyer,
            _buyer2,
            _marketFeeWallet

        ] = await ethers.getSigners();


        // DFY Token 
        const dFYTokenFactory = await hre.ethers.getContractFactory(artifactDFYToken);
        const dfyContract = await dFYTokenFactory.deploy();
        _DFYTokenContract = await dfyContract.deployed();

        // contract Hub 
        const hubContractFactory = await hre.ethers.getContractFactory(artifactHub);
        const hubContract = await hre.upgrades.deployProxy(
            hubContractFactory,
            [_marketFeeWallet.address, _DFYTokenContract.address, _deployer.address],
            { kind: "uups" }

        );
        _hubContract = await hubContract.deployed();
        console.log(_hubContract.address, "address hub contract : ");

        // set market fee Rate for contract SellNFT 
        await _hubContract.connect(_deployer).setSystemConfig(_marketFeeWallet.address, _DFYTokenContract.address);
        await _hubContract.setNFTMarketConfig(_zoom, _marketFeeRate, _marketFeeWallet.address);

        // DFY Factory 
        const DFYFactory = await hre.ethers.getContractFactory(artifactDFYFactory);
        const DFYFactoryContract = await hre.upgrades.deployProxy(
            DFYFactory,
            [_hubContract.address],
            { kind: "uups" }
        );
        _DFYFactoryContract = await DFYFactoryContract.deployed();

        // DFY NFT
        await _DFYFactoryContract.connect(_originCreator).createCollection(_tokenName, _symbol, 0, _cidOfCollection.toString());
        this.DFYNFTFactory = await hre.ethers.getContractFactory(artfactDFYNFT);
        let getAddressContractOfCreatetor = await _DFYFactoryContract.collectionsByOwner(_originCreator.address, 0);
        _DFYContract = this.DFYNFTFactory.attach(getAddressContractOfCreatetor);

        // Sell NFT 
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


    });

    describe("unit test DFY ", async () => {

        it("origin creator put on sale and sell use BEP20 and check it information : ", async () => {

            // transfer DFY Token for buyer 
            await _DFYTokenContract.connect(_deployer).mint(BigInt(100 * 10 ** 18));
            await _DFYTokenContract.connect(_deployer).transfer(_buyer.address, BigInt(10 * 10 ** 18));
            await _DFYTokenContract.connect(_buyer).approve(_sellNFTContract.address, BigInt(10 * 10 ** 18));

            // safe mint 
            await _DFYContract.connect(_originCreator).safeMint(_originCreator.address, _royaltyRateDFY, _cidOfNFT);
            await _DFYContract.connect(_originCreator).setApprovalForAll(_sellNFTContract.address, true);

            let balanceOfOriginCreatorBeforeTXT = await _DFYTokenContract.balanceOf(_originCreator.address);
            let balanceOfMarketFeeWalletBeforeTXT = await _DFYTokenContract.balanceOf(_marketFeeWallet.address);
            let balanceOfBuyerBeforeTXT = await _DFYTokenContract.balanceOf(_buyer.address);

            console.log("before transaction : ");
            console.log(balanceOfOriginCreatorBeforeTXT.toString(), "balance of origin creator before txt : ");
            console.log(balanceOfMarketFeeWalletBeforeTXT.toString(), "balance of marketFee wallet before txt :");
            console.log(balanceOfBuyerBeforeTXT.toString(), "balance of buyer before txt :");

            // put on sale 
            await _sellNFTContract.connect(_originCreator).putOnSales(_firstToken, 1, _price, _DFYTokenContract.address, _DFYContract.address);

            // buy NFT 
            await _sellNFTContract.connect(_buyer).buyNFT(0, 1);

            let balanceOfOriginCreatorAfterTXT = await _DFYTokenContract.balanceOf(_originCreator.address);
            let balanceOfMarketFeeWalletAfterTXT = await _DFYTokenContract.balanceOf(_marketFeeWallet.address);
            let balanceOfBuyerAfterTXT = await _DFYTokenContract.balanceOf(_buyer.address);

            console.log("after transaction : ");
            console.log(balanceOfOriginCreatorAfterTXT.toString(), "balance of origin creator after txt : ");
            console.log(balanceOfMarketFeeWalletAfterTXT.toString(), "balance of marketFee wallet after txt :");
            console.log(balanceOfBuyerAfterTXT.toString(), "balance of buyer after txt :");

            // calculator 
            let info = await _sellNFTContract.orders(0);
            let marketFee = BigInt(info.price) * BigInt(_marketFeeRate) / BigInt(_zoom * 100);
            let amountPaidToSeller = BigInt(info.price) - BigInt(marketFee);
            let newOwner = await _DFYContract.ownerOf(_firstToken);

            expect(balanceOfOriginCreatorBeforeTXT).to.equal(BigInt(balanceOfOriginCreatorAfterTXT) - BigInt(amountPaidToSeller));
            expect(balanceOfBuyerBeforeTXT).to.equal(BigInt(balanceOfBuyerAfterTXT) + BigInt(info.price));
            expect(balanceOfMarketFeeWalletBeforeTXT).to.equal(BigInt(balanceOfMarketFeeWalletAfterTXT) - BigInt(marketFee));
            expect(newOwner).to.equal(_buyer.address);

        });

        it("not Origin creator put on sale and buy it with BNB and check it information : ", async () => {

            // aprove for sellNFT contract 
            await _DFYContract.connect(_buyer).setApprovalForAll(_sellNFTContract.address, true);
            // put on sale 
            await _sellNFTContract.connect(_buyer).putOnSales(_firstToken, 1, _price2, BNB_ADDRESS, _DFYContract.address);

            let balanceOfOriginCreatorBeforeTXT = await _originCreator.getBalance()
            let balanceOfMarketFeeWalletBeforeTXT = await _marketFeeWallet.getBalance();
            let balanceOfSellerBeforeTXT = await _buyer.getBalance();
            let balanceOfBuyerBeforeTXT = await _buyer2.getBalance();

            console.log("before transaction : ");
            console.log(balanceOfOriginCreatorBeforeTXT.toString(), "balance of origin creator before txt : ");
            console.log(balanceOfMarketFeeWalletBeforeTXT.toString(), "balance of marketFee wallet before txt :");
            console.log(balanceOfSellerBeforeTXT.toString(), "balance of seller before txt :");
            console.log(balanceOfBuyerBeforeTXT.toString(), "balance of buyer before txt :");

            // buyNFT 
            await _sellNFTContract.connect(_buyer2).buyNFT(1, 1, { value: BigInt(2 * 10 ** 18) });

            let balanceOfOriginCreatorAfterTXT = await _originCreator.getBalance()
            let balanceOfMarketFeeWalletAfterTXT = await _marketFeeWallet.getBalance();
            let balanceOfSellerBAfterTXT = await _buyer.getBalance();
            let balanceOfBuyerAfterTXT = await _buyer2.getBalance();

            // 192661294550088
            // calculate 
            let info = await _sellNFTContract.orders(1);
            let feeGasBuy = BigInt(balanceOfBuyerBeforeTXT) - BigInt(balanceOfBuyerAfterTXT) - BigInt(info.price);
            console.log("fee gas buy", feeGasBuy.toString());
            let newOwner = await _DFYContract.ownerOf(_firstToken);
            let marketFee = BigInt(info.price) * BigInt(_marketFeeRate) / BigInt(_zoom * 100);
            let royaltyFee = BigInt(info.price) * BigInt(_royaltyRateDFY) / BigInt(_zoom * 100);
            let amountPaidToSeller = BigInt(info.price) - BigInt(marketFee) - BigInt(royaltyFee);


            console.log("AfterT transaction : ");
            console.log(balanceOfOriginCreatorAfterTXT.toString(), "balance of origin creator AfterT txt : ");
            console.log(balanceOfMarketFeeWalletAfterTXT.toString(), "balance of marketFee wallet AfterT txt :");
            console.log(balanceOfSellerBAfterTXT.toString(), "balance of seller AfterT txt :");
            console.log(balanceOfBuyerAfterTXT.toString(), "balance of buyer AfterT txt :");


            expect(newOwner).to.equal(_buyer2.address);
            expect(balanceOfBuyerBeforeTXT).to.equal(BigInt(balanceOfBuyerAfterTXT) + BigInt(info.price) + BigInt(feeGasBuy));
            expect(balanceOfSellerBeforeTXT).to.equal(BigInt(balanceOfSellerBAfterTXT) - BigInt(amountPaidToSeller));
            expect(balanceOfMarketFeeWalletBeforeTXT).to.equal(BigInt(balanceOfMarketFeeWalletAfterTXT) - BigInt(marketFee));
            expect(balanceOfOriginCreatorBeforeTXT).to.equal(BigInt(balanceOfOriginCreatorAfterTXT) - BigInt(royaltyFee));

        });


        it("cancel listing and check it ", async () => {

            await _DFYContract.connect(_buyer2).setApprovalForAll(_sellNFTContract.address, true);
            await _sellNFTContract.connect(_buyer2).putOnSales(_firstToken, 1, _price2, BNB_ADDRESS, _DFYContract.address);

            // seller cancel listing 
            await _sellNFTContract.connect(_buyer2).cancelListing(2);
            let isOnsale = await _sellNFTContract.isTokenOnSales(_firstToken, _DFYContract.address);
            expect(isOnsale).to.equal(false);

        });

    });
});