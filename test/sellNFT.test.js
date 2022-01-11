const hre = require("hardhat");
const { expect, assert } = require("chai");
const balance = require("@openzeppelin/test-helpers/src/balance");
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
    let _royaltyRateDFY = 10 * 10 ** 5; // 10%
    let _zoom = 1e5; // 50000
    let _marketFeeRate = 2.5 * 10 ** 5; // 2,5 % 
    let _price = BigInt(1 * 10 ** 18);
    let _price2 = BigInt(2 * 10 ** 18);
    let _cidOfCollection = "QmZfey7KWSZwwkU4DeBch6jsXSjdNp2UYYhVq4RZYPGr4Z";
    let _cidOfNFT = "QmbDE5EDoiGAYLTQzmftDx96L4UDMT6Ra2km5HqtU89JWn";
    let _firstToken = 0;
    let _secondToken = 1;
    let _thirdToken = 2;
    let _fourthToken = 3;

    const orderStatus = {
        ON_SALES: 0,
        COMPLETED: 1
    };

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
        let getDFYFactorySignature = await _DFYFactoryContract.signature();

        // DFY NFT
        // setContractHub
        await _DFYFactoryContract.connect(_deployer).setContractHub(_hubContract.address);
        await _hubContract.registerContract(getDFYFactorySignature, DFYFactoryContract.address, artifactDFYFactory);
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

    describe("unit test SellNFT ", async () => {

        it("Case 1:  origin creator put on sale and sell use BEP20 and check it information : ", async () => {
            // transfer DFY Token for buyer 
            await _DFYTokenContract.connect(_deployer).mint(BigInt(100 * 10 ** 18));
            await _DFYTokenContract.connect(_deployer).transfer(_buyer.address, BigInt(10 * 10 ** 18));
            await _DFYTokenContract.connect(_buyer).approve(_sellNFTContract.address, BigInt(10 * 10 ** 18));

            // safe mint 
            await _DFYContract.connect(_originCreator).safeMint(_originCreator.address, _royaltyRateDFY, _cidOfNFT);
            await _DFYContract.connect(_originCreator).setApprovalForAll(_sellNFTContract.address, true);

            let balanceOfOriginCreatorBeforePutOnSale = await _DFYTokenContract.balanceOf(_originCreator.address);
            let balanceOfMarketFeeWalletBeforePutOnSale = await _DFYTokenContract.balanceOf(_marketFeeWallet.address);
            let balanceOfBuyerBeforeBuyNFT = await _DFYTokenContract.balanceOf(_buyer.address);

            console.log("before Put On Sale : ");
            console.log(balanceOfOriginCreatorBeforePutOnSale.toString(), "balance of origin creator before put on sale : ");
            console.log(balanceOfMarketFeeWalletBeforePutOnSale.toString(), "balance of marketFee wallet before put on sale :");
            console.log(balanceOfBuyerBeforeBuyNFT.toString(), "balance of buyer before put on sale :");

            // put on sale 
            let getEventPutOnsale = await _sellNFTContract.connect(_originCreator).putOnSales(_firstToken, 1, _price, _DFYTokenContract.address, _DFYContract.address);
            let reciptEventPutOnSale = await getEventPutOnsale.wait();
            console.log(`\x1b[31m Event origin creator put on sale : \x1b[0m`);
            expect(reciptEventPutOnSale.events[0.].args[3]).to.equal(orderStatus.ON_SALES);

            // buy NFT 
            let getEventBuyNFT = await _sellNFTContract.connect(_buyer).buyNFT(0, 1);
            let reciptEventBuyNFT = await getEventBuyNFT.wait();
            console.log(`\x1b[31m Event buyer buy NFT : \x1b[0m`);
            console.log(reciptEventBuyNFT.events[6]);
            expect(reciptEventBuyNFT.events[6].args[0].status).to.equal(orderStatus.COMPLETED);

            let balanceOfOriginCreatorAfterPutOnSale = await _DFYTokenContract.balanceOf(_originCreator.address);
            let balanceOfMarketFeeWalletAfterPutOnSale = await _DFYTokenContract.balanceOf(_marketFeeWallet.address);
            let balanceOfBuyerAfterBuyNFT = await _DFYTokenContract.balanceOf(_buyer.address);

            console.log("after Buy NFT : ");
            console.log(balanceOfOriginCreatorAfterPutOnSale.toString(), "balance of origin creator after txt : ");
            console.log(balanceOfMarketFeeWalletAfterPutOnSale.toString(), "balance of marketFee wallet after txt :");
            console.log(balanceOfBuyerAfterBuyNFT.toString(), "balance of buyer after txt :");

            // calculator 
            let info = await _sellNFTContract.orders(0);
            let marketFee = BigInt(info.price) * BigInt(_marketFeeRate) / BigInt(_zoom * 100);
            let amountPaidToSeller = BigInt(info.price) - BigInt(marketFee);
            let newOwner = await _DFYContract.ownerOf(_firstToken);

            expect(balanceOfOriginCreatorBeforePutOnSale).to.equal(BigInt(balanceOfOriginCreatorAfterPutOnSale) - BigInt(amountPaidToSeller));
            expect(balanceOfBuyerBeforeBuyNFT).to.equal(BigInt(balanceOfBuyerAfterBuyNFT) + BigInt(info.price));
            expect(balanceOfMarketFeeWalletBeforePutOnSale).to.equal(BigInt(balanceOfMarketFeeWalletAfterPutOnSale) - BigInt(marketFee));
            expect(newOwner).to.equal(_buyer.address);
        });

        it("Case 2: not Origin creator put on sale and buy it with BNB and check it information : ", async () => {

            // aprove for sellNFT contract 
            await _DFYContract.connect(_buyer).setApprovalForAll(_sellNFTContract.address, true);

            let balanceOfOriginCreatorBeforeBuyNFT = await _originCreator.getBalance()
            let balanceOfMarketFeeWalletBeforeBuyNFT = await _marketFeeWallet.getBalance();
            let balanceOfSellerBeforePutOnSale = await _buyer.getBalance();
            let balanceOfBuyerBeforeBuyNFT = await _buyer2.getBalance();
            let owner = await _DFYContract.ownerOf(_firstToken);

            console.log("before Put On Sale : ");
            console.log("balance of origin creator before BuyNFT : ", balanceOfOriginCreatorBeforeBuyNFT.toString());
            console.log("balance of marketFee wallet before BuyNFT :", balanceOfMarketFeeWalletBeforeBuyNFT.toString());
            console.log("balance of seller before put on sale :", balanceOfSellerBeforePutOnSale.toString());
            console.log("balance of buyer before BuyNFT :", balanceOfBuyerBeforeBuyNFT.toString());
            console.log("onwer of NFT before put on sale :", owner);

            // put on sale 
            await _sellNFTContract.connect(_buyer).putOnSales(_firstToken, 1, _price2, BNB_ADDRESS, _DFYContract.address);

            // buyNFT 
            await _sellNFTContract.connect(_buyer2).buyNFT(1, 1, { value: BigInt(2 * 10 ** 18) });

            let balanceOfOriginCreatorAfterBuyNFT = await _originCreator.getBalance()
            let balanceOfMarketFeeWalletAfterBuyNFT = await _marketFeeWallet.getBalance();
            let balanceOfSellerAfterBuyNFT = await _buyer.getBalance();
            let balanceOfBuyerAfterBuyNFT = await _buyer2.getBalance();
            owner = await _DFYContract.ownerOf(_firstToken);

            console.log("AfterT BuyNFT : ");
            console.log("balance of origin creator After buyNFT : ", balanceOfOriginCreatorAfterBuyNFT.toString());
            console.log("balance of marketFee wallet After buyNFT :", balanceOfMarketFeeWalletAfterBuyNFT.toString());
            console.log("balance of seller After buyNFT :", balanceOfSellerAfterBuyNFT.toString());
            console.log("balance of buyer After buyNFT :", balanceOfBuyerAfterBuyNFT.toString());

            // calculate 
            let info = await _sellNFTContract.orders(1);
            let feeGasBuy = BigInt(balanceOfBuyerBeforeBuyNFT) - BigInt(balanceOfBuyerAfterBuyNFT) - BigInt(info.price);
            console.log("fee gas buy", feeGasBuy.toString());
            let newOwner = await _DFYContract.ownerOf(_firstToken);
            let marketFee = BigInt(info.price) * BigInt(_marketFeeRate) / BigInt(_zoom * 100);
            let royaltyFee = BigInt(info.price) * BigInt(_royaltyRateDFY) / BigInt(_zoom * 100);
            let feeGasPutOnSale = BigInt(info.price) - BigInt(marketFee) - BigInt(royaltyFee) - (BigInt(balanceOfSellerAfterBuyNFT) - BigInt(balanceOfSellerBeforePutOnSale));
            let amountPaidToSeller = BigInt(info.price) - BigInt(marketFee) - BigInt(royaltyFee) - BigInt(feeGasPutOnSale);

            console.log("market fee : ", marketFee.toString());
            console.log("royaltyFee : ", royaltyFee.toString());
            console.log("amountPaidToSeller", amountPaidToSeller.toString());
            console.log("fee gas put on sale", feeGasPutOnSale.toString());

            expect(newOwner).to.equal(_buyer2.address);
            expect(balanceOfBuyerBeforeBuyNFT).to.equal(BigInt(balanceOfBuyerAfterBuyNFT) + BigInt(info.price) + BigInt(feeGasBuy));
            expect(balanceOfSellerBeforePutOnSale).to.equal(BigInt(balanceOfSellerAfterBuyNFT) - BigInt(amountPaidToSeller));
            expect(balanceOfMarketFeeWalletBeforeBuyNFT).to.equal(BigInt(balanceOfMarketFeeWalletAfterBuyNFT) - BigInt(marketFee));
            expect(balanceOfOriginCreatorBeforeBuyNFT).to.equal(BigInt(balanceOfOriginCreatorAfterBuyNFT) - BigInt(royaltyFee));
        });

        it("Case 3: Seller cancel listing and check it ", async () => {

            await _DFYContract.connect(_buyer2).setApprovalForAll(_sellNFTContract.address, true);
            await _sellNFTContract.connect(_buyer2).putOnSales(_firstToken, 1, _price2, BNB_ADDRESS, _DFYContract.address);

            // seller cancel listing 
            let getEventCancel = await _sellNFTContract.connect(_buyer2).cancelListing(2);
            let reciptEventCancel = await getEventCancel.wait();
            console.log(`\x1b[31m Event Customer cancel listing : \x1b[0m`);
            console.log(reciptEventCancel.events);

            let isOnsale = await _sellNFTContract.isTokenOnSales(_firstToken, _DFYContract.address);
            expect(isOnsale).to.equal(false);
        });

    });
});