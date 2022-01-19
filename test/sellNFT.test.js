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
    let _DFYContract2 = null;
    let _sellNFTContract = null;
    let _DFYTokenContract = null;
    let _hubContract = null;

    let _tokenName = "DefiForYou";
    let _symbol = "DFY-NFT";
    let _royaltyRateDFY = 10 * 10 ** 5; // 10%
    let _zoom = 1e5; // 50000
    let _marketFeeRate = 2.5 * 10 ** 5; // 2,5 % 
    let _cidOfCollection = "QmZfey7KWSZwwkU4DeBch6jsXSjdNp2UYYhVq4RZYPGr4Z";
    let _cidOfNFT = "QmbDE5EDoiGAYLTQzmftDx96L4UDMT6Ra2km5HqtU89JWn";

    const listOrders = {
        FIRSTID: 0,
        SECONDID: 1,
        THIRDID: 2,
        FOURID: 3,
        FIVEID: 4,
        SIXID: 5
    };
    const orderStatus = {
        ON_SALES: 0,
        COMPLETED: 1
    };
    const nftOfOriginCreator = {
        FIRSTID: 0,
        SECONDID: 1,
        THIRDID: 2,
        FOURID: 3,
        FIVEID: 4
    };
    const nftOfOriginCreator2 = {
        FIRSTID: 0,
        SECONDID: 1,
        THIRDID: 2,
        FOURID: 3
    };
    const putOnSaleException = {
        0: "Token is already put on sales",
        1: "Not token owner",
        2: "Spender is not approved",
        3: "Invalid price"
    };
    const buyNFTException = {
        0: "Sales unavailable",
        1: "Buying owned NFT",
    };
    const cancelListingException = {
        0: "Order's seller is required"
    };

    before(async () => {
        [
            _deployer,
            _originCreator1,
            _originCreator2,
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

        // -> set market fee Rate for contract SellNFT 
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
        // -> setContractHub
        await _DFYFactoryContract.connect(_deployer).setContractHub(_hubContract.address);
        await _hubContract.registerContract(getDFYFactorySignature, DFYFactoryContract.address, artifactDFYFactory);

        // -> origin creator 1 create collection
        await _DFYFactoryContract.connect(_originCreator1).createCollection(_tokenName, _symbol, 0, _cidOfCollection.toString());
        this.DFYNFTFactory = await hre.ethers.getContractFactory(artfactDFYNFT);
        let getAddressContractOfCreatetor = await _DFYFactoryContract.collectionsByOwner(_originCreator1.address, 0);
        _DFYContract = this.DFYNFTFactory.attach(getAddressContractOfCreatetor);

        // -> origin creator 2 create collection
        await _DFYFactoryContract.connect(_originCreator2).createCollection(_tokenName, _symbol, 0, _cidOfCollection.toString());
        let getAddressContractOfCreatetor2 = await _DFYFactoryContract.collectionsByOwner(_originCreator2.address, 0);
        _DFYContract2 = this.DFYNFTFactory.attach(getAddressContractOfCreatetor2);

        // Sell NFT 
        const sellNFTFactory = await hre.ethers.getContractFactory(artifactSellNFT);
        const sellNFTContract = await hre.upgrades.deployProxy(
            sellNFTFactory,
            [_hubContract.address],
            { kind: "uups" }

        );
        _sellNFTContract = await sellNFTContract.deployed();
        console.log(_sellNFTContract.address, "address SellNFT contract : ");
        // -> hub call registerContract  
        const signatureSell = await _sellNFTContract.signature();
        await _hubContract.registerContract(signatureSell, _sellNFTContract.address, artifactSellNFT);
    });

    describe("unit test SellNFT ", async () => {

        it("Case 1: put on sale - origin creator put on sale and buyer buy use erc20  : ", async () => {
            // -> transfer DFY Token for buyer 
            await _DFYTokenContract.connect(_deployer).mint(BigInt(100 * 10 ** 18));
            await _DFYTokenContract.connect(_deployer).transfer(_buyer.address, BigInt(10 * 10 ** 18));
            await _DFYTokenContract.connect(_buyer).approve(_sellNFTContract.address, BigInt(10 * 10 ** 18));

            // -> safe mint 
            await _DFYContract.connect(_originCreator1).safeMint(_originCreator1.address, _royaltyRateDFY, _cidOfNFT);
            await _DFYContract.connect(_originCreator1).setApprovalForAll(_sellNFTContract.address, true);

            let balanceOfOriginCreatorBeforePutOnSale = await _DFYTokenContract.balanceOf(_originCreator1.address);
            let balanceOfMarketFeeWalletBeforePutOnSale = await _DFYTokenContract.balanceOf(_marketFeeWallet.address);
            let balanceOfBuyerBeforeBuyNFT = await _DFYTokenContract.balanceOf(_buyer.address);

            console.log("before Put On Sale : ");
            console.log(balanceOfOriginCreatorBeforePutOnSale.toString(), "balance of origin creator before put on sale : ");
            console.log(balanceOfMarketFeeWalletBeforePutOnSale.toString(), "balance of marketFee wallet before put on sale :");
            console.log(balanceOfBuyerBeforeBuyNFT.toString(), "balance of buyer before put on sale :");

            // -> put on sale 
            let getEventPutOnsale = await _sellNFTContract.connect(_originCreator1).putOnSales(nftOfOriginCreator.FIRSTID, 1, BigInt(1 * 10 ** 18), _DFYTokenContract.address, _DFYContract.address);
            let reciptEventPutOnSale = await getEventPutOnsale.wait();
            console.log(`\x1b[31m Event origin creator put on sale : \x1b[0m`);
            expect(reciptEventPutOnSale.events[0.].args[3]).to.equal(orderStatus.ON_SALES);

            // -> buy NFT 
            let getEventBuyNFT = await _sellNFTContract.connect(_buyer).buyNFT(nftOfOriginCreator.FIRSTID, 1);
            let reciptEventBuyNFT = await getEventBuyNFT.wait();
            console.log(`\x1b[31m Event buyer buy NFT : \x1b[0m`);
            console.log(reciptEventBuyNFT.events[6]);
            expect(reciptEventBuyNFT.events[6].args[0].status).to.equal(orderStatus.COMPLETED);

            let balanceOfOriginCreatorAfterPutOnSale = await _DFYTokenContract.balanceOf(_originCreator1.address);
            let balanceOfMarketFeeWalletAfterPutOnSale = await _DFYTokenContract.balanceOf(_marketFeeWallet.address);
            let balanceOfBuyerAfterBuyNFT = await _DFYTokenContract.balanceOf(_buyer.address);

            console.log("after Buy NFT : ");
            console.log(balanceOfOriginCreatorAfterPutOnSale.toString(), "balance of origin creator after txt : ");
            console.log(balanceOfMarketFeeWalletAfterPutOnSale.toString(), "balance of marketFee wallet after txt :");
            console.log(balanceOfBuyerAfterBuyNFT.toString(), "balance of buyer after txt :");

            // calculator 
            let info = await _sellNFTContract.orders(nftOfOriginCreator.FIRSTID);
            let marketFee = BigInt(info.price) * BigInt(_marketFeeRate) / BigInt(_zoom * 100);
            let amountPaidToSeller = BigInt(info.price) - BigInt(marketFee);
            let newOwner = await _DFYContract.ownerOf(nftOfOriginCreator.FIRSTID);

            expect(balanceOfOriginCreatorBeforePutOnSale).to.equal(BigInt(balanceOfOriginCreatorAfterPutOnSale) - BigInt(amountPaidToSeller));
            expect(balanceOfBuyerBeforeBuyNFT).to.equal(BigInt(balanceOfBuyerAfterBuyNFT) + BigInt(info.price));
            expect(balanceOfMarketFeeWalletBeforePutOnSale).to.equal(BigInt(balanceOfMarketFeeWalletAfterPutOnSale) - BigInt(marketFee));
            expect(newOwner).to.equal(_buyer.address);
        });

        it("Case 2: put on sale - Exception put token already put on sales", async () => {

            // -> safe mint 
            await _DFYContract.connect(_originCreator1).safeMint(_originCreator1.address, _royaltyRateDFY, _cidOfNFT);
            await _DFYContract.connect(_originCreator1).setApprovalForAll(_sellNFTContract.address, true);

            // -> put on sale 
            let getEventPutOnsale = await _sellNFTContract.connect(_originCreator1).putOnSales(nftOfOriginCreator.SECONDID, 1, BigInt(2 * 10 ** 18), BNB_ADDRESS, _DFYContract.address);
            let reciptEventPutOnSale = await getEventPutOnsale.wait();
            console.log(`\x1b[31m Event origin creator put on sale : \x1b[0m`);
            expect(reciptEventPutOnSale.events[0.].args[3]).to.equal(orderStatus.ON_SALES);

            // exception
            await expect(_sellNFTContract.connect(_originCreator1).putOnSales(nftOfOriginCreator.SECONDID, 1,
                BigInt(2 * 10 ** 18), _DFYTokenContract.address, _DFYContract.address))
                .to.be.revertedWith(putOnSaleException[0]);
        });

        it("Case 3: put on sale - Exception Not token owner", async () => {

            // -> safe mint 
            await _DFYContract.connect(_originCreator1).safeMint(_originCreator1.address, _royaltyRateDFY, _cidOfNFT);

            // exception 
            await expect(_sellNFTContract.connect(_deployer).putOnSales(nftOfOriginCreator.THIRDID, 1,
                BigInt(3 * 10 ** 18), _DFYTokenContract.address, _DFYContract.address))
                .to.be.revertedWith(putOnSaleException[1]);
        });

        it("Case 4: put on sale - Exception Spender is not approved", async () => {

            // -> safe mint 
            await _DFYContract2.connect(_originCreator2).safeMint(_originCreator2.address, _royaltyRateDFY, _cidOfNFT);

            // exception 
            await expect(_sellNFTContract.connect(_originCreator2).putOnSales(nftOfOriginCreator2.FIRSTID, 1,
                BigInt(4 * 10 ** 18), _DFYTokenContract.address, _DFYContract2.address))
                .to.be.revertedWith(putOnSaleException[2]);
        });

        it("Case 5: put on sale - Exception invalid price", async () => {

            // exception 
            await expect(_sellNFTContract.connect(_originCreator1).putOnSales(nftOfOriginCreator.THIRDID, 1,
                0, _DFYTokenContract.address, _DFYContract.address))
                .to.be.revertedWith(putOnSaleException[3]);
        });

        it("Case 6: not Origin creator put on sale and buyer buy with BNB : ", async () => {

            // -> aprove for sellNFT contract 
            await _DFYContract.connect(_buyer).setApprovalForAll(_sellNFTContract.address, true);

            let balanceOfOriginCreatorBeforeBuyNFT = await _originCreator1.getBalance()
            let balanceOfMarketFeeWalletBeforeBuyNFT = await _marketFeeWallet.getBalance();
            let balanceOfSellerBeforePutOnSale = await _buyer.getBalance();
            let balanceOfBuyerBeforeBuyNFT = await _buyer2.getBalance();
            let owner = await _DFYContract.ownerOf(nftOfOriginCreator.FIRSTID);

            console.log("before Put On Sale : ");
            console.log("balance of origin creator before BuyNFT : ", balanceOfOriginCreatorBeforeBuyNFT.toString());
            console.log("balance of marketFee wallet before BuyNFT :", balanceOfMarketFeeWalletBeforeBuyNFT.toString());
            console.log("balance of seller before put on sale :", balanceOfSellerBeforePutOnSale.toString());
            console.log("balance of buyer before BuyNFT :", balanceOfBuyerBeforeBuyNFT.toString());
            console.log("onwer of NFT before put on sale :", owner);

            // -> put on sale 
            await _sellNFTContract.connect(_buyer).putOnSales(nftOfOriginCreator.FIRSTID, 1, BigInt(2 * 10 ** 18), BNB_ADDRESS, _DFYContract.address);

            // -> buyNFT 
            await _sellNFTContract.connect(_buyer2).buyNFT(listOrders.THIRDID, 1, { value: BigInt(3 * 10 ** 18) });

            let balanceOfOriginCreatorAfterBuyNFT = await _originCreator1.getBalance()
            let balanceOfMarketFeeWalletAfterBuyNFT = await _marketFeeWallet.getBalance();
            let balanceOfSellerAfterBuyNFT = await _buyer.getBalance();
            let balanceOfBuyerAfterBuyNFT = await _buyer2.getBalance();
            owner = await _DFYContract.ownerOf(nftOfOriginCreator.FIRSTID);

            console.log("AfterT BuyNFT : ");
            console.log("balance of origin creator After buyNFT : ", balanceOfOriginCreatorAfterBuyNFT.toString());
            console.log("balance of marketFee wallet After buyNFT :", balanceOfMarketFeeWalletAfterBuyNFT.toString());
            console.log("balance of seller After buyNFT :", balanceOfSellerAfterBuyNFT.toString());
            console.log("balance of buyer After buyNFT :", balanceOfBuyerAfterBuyNFT.toString());

            // calculate 
            let info = await _sellNFTContract.orders(listOrders.THIRDID);
            let feeGasBuy = BigInt(balanceOfBuyerBeforeBuyNFT) - BigInt(balanceOfBuyerAfterBuyNFT) - BigInt(info.price);
            console.log("fee gas buy", feeGasBuy.toString());
            let newOwner = await _DFYContract.ownerOf(nftOfOriginCreator.FIRSTID);
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

        it("Case 7: buyNFT - Exception  order.status != on sales ", async () => {

            // -> safe mint
            await _DFYContract.connect(_originCreator1).safeMint(_originCreator1.address, _royaltyRateDFY, _cidOfNFT);
            await _DFYContract.connect(_originCreator1).setApprovalForAll(_sellNFTContract.address, true);

            // -> put on sale 
            await _sellNFTContract.connect(_originCreator1).putOnSales(nftOfOriginCreator.FOURID, 1,
                BigInt(3 * 10 ** 18), _DFYTokenContract.address, _DFYContract.address);

            // -> buyNFT
            await _sellNFTContract.connect(_buyer).buyNFT(listOrders.FOURID, 1, { value: BigInt(5 * 10 ** 18) });

            // exception 
            await expect(_sellNFTContract.connect(_buyer).buyNFT(listOrders.FOURID, 1, { value: BigInt(5 * 10 ** 18) }))
                .to.be.revertedWith(buyNFTException[0]);
        });

        it("Case 8: buyNFT - Exception owner's NFT buy owned NFT ", async () => {

            // -> safe mint 
            await _DFYContract.connect(_originCreator1).safeMint(_originCreator1.address, _royaltyRateDFY, _cidOfNFT);
            await _DFYContract.connect(_originCreator1).setApprovalForAll(_sellNFTContract.address, true);

            // -> put on sale 
            await _sellNFTContract.connect(_originCreator1).putOnSales(nftOfOriginCreator.FIVEID, 1,
                BigInt(2 * 10 ** 18), _DFYTokenContract.address, _DFYContract.address);

            // exception 
            await expect(_sellNFTContract.connect(_originCreator1).buyNFT(listOrders.FIVEID, 1, { value: BigInt(5 * 10 ** 18) }))
                .to.be.revertedWith(buyNFTException[1]);
        });

        it("Case 9: Seller cancel listing", async () => {

            // -> cancel listing 
            let getEventCancel = await _sellNFTContract.connect(_originCreator1).cancelListing(listOrders.FIVEID);
            let reciptEventCancel = await getEventCancel.wait();
            console.log(`\x1b[31m Event Customer cancel listing : \x1b[0m`);
            console.log(reciptEventCancel.events);

            let isOnsale = await _sellNFTContract.isTokenOnSales(nftOfOriginCreator.FIRSTID, _DFYContract.address);
            expect(isOnsale).to.equal(false);
        });

        it("Case 10: cancel listing - Exception not owner of order cancel listing ", async () => {

            // -> put on sale 
            await _sellNFTContract.connect(_originCreator1).putOnSales(nftOfOriginCreator.FIVEID, 1,
                BigInt(3 * 10 ** 18), _DFYTokenContract.address, _DFYContract.address);

            // exception 
            await expect(_sellNFTContract.connect(_buyer).cancelListing(listOrders.SIXID))
                .to.be.revertedWith(cancelListingException[0]);
        });
    });
});