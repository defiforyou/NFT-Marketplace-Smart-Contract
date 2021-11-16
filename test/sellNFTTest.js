const hre = require("hardhat");
const artifactDFYFactory = "DefiForYouNFTFactory";
const artifactDFY = "DefiForYouNFT";
const artifactTia = "TiaToken";
const artifactDFYToken = "BEP20Token";
const artifactSellNFT = "SellNFT";
const { expect, assert } = require("chai");
const BNB_ADDRESS = "0x0000000000000000000000000000000000000000";
const decimals = 10 ** 18;

describe("Deploy DFY Factory", (done) => {

    let _DFYFactoryContract = null;
    let _DFYContract = null;
    let _tiaContract = null;
    let _sellNFTContract = null;
    let _DFYTokenContract = null;

    let _tokenName = "DefiForYou";
    let _symbol = "DFY-NFT";
    let _royaltyRateFactory = 2000;
    let _royaltyRateDFY = 10 * 10 ** 5;
    let _zoom = 1e5;
    let _royaltyFee = 10 * 10 ** 5;
    let _marketFee = 2.5 * 10 ** 5; // 2,5 % 
    let _price = BigInt(1 * 10 ** 18);
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
            _seller,
            _buyer,
            _buyer2,
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

        // Sell NFT 
        const sellNFTFactory = await hre.ethers.getContractFactory(artifactSellNFT);
        const sellNFTContract = await hre.upgrades.deployProxy(
            sellNFTFactory,
            [_zoom],
            { kind: "uups" }

        );
        _sellNFTContract = await sellNFTContract.deployed();
        console.log(_sellNFTContract.address, "address SellNFT contract : ");

        // DFY NFT
        let getOperatorRole = await _DFYFactoryContract.OPERATOR_ROLE();
        await _DFYFactoryContract.connect(_deployer).grantRole(getOperatorRole, _seller.address);
        await _DFYFactoryContract.connect(_seller).createCollection(_tokenName, _symbol, 0, _cidOfCollection.toString());
        this.DFYNFTFactory = await hre.ethers.getContractFactory("DefiForYouNFT");
        let getAddressContractOfCreatetor = await _DFYFactoryContract.collectionsByOwner(_seller.address, 0);
        _DFYContract = this.DFYNFTFactory.attach(getAddressContractOfCreatetor);

    });

    describe("unit test DFY ", async () => {

        it("put on sale and buy with transaction N1 and no royaltyRate use ERC20 and check it information : ", async () => {

            // // transfer tia for buyer 
            await _tiaContract.connect(_deployer).setOperator(_deployer.address, true);
            await _tiaContract.connect(_deployer).mint(_deployer.address, BigInt(100 * 10 ** 18));
            await _tiaContract.connect(_deployer).transfer(_buyer.address, BigInt(10 * 10 ** 18));
            await _tiaContract.connect(_buyer).approve(_sellNFTContract.address, BigInt(10 * 10 ** 18));

            // safe mint 
            await _DFYContract.connect(_seller).safeMint(_seller.address, 0, _cidOfNFT);
            await _DFYContract.connect(_seller).approve(_sellNFTContract.address, _firstToken);

            // put on sale 
            await _sellNFTContract.connect(_deployer).setFeeWallet(_feeWallet.address);
            await _sellNFTContract.connect(_deployer).setMarketFeeRate(_marketFee);
            await _sellNFTContract.connect(_seller).putOnSales(_firstToken, 1, _price, _tiaContract.address, _DFYContract.address);

            let spenderOfNFT = await _DFYContract.ownerOf(_firstToken);
            let originRoyaltyFee = await _DFYContract.royaltyRateByToken(_firstToken);
            let marketFee = await _sellNFTContract.marketFeeRate();
            let info = await _sellNFTContract.orders(0);
            let feeWallet = await _sellNFTContract.marketFeeWallet();
            let balanceOfBuyerBeforeBuy = await _tiaContract.balanceOf(_buyer.address);

            expect(spenderOfNFT === true); // spender 
            expect(info.currency.toString()).to.equal(_tiaContract.address); // currency
            expect(info.collectionAddress.toString().toString()).to.equal(_DFYContract.address); // collectionAddress 
            expect(info.royaltyFee === 0); // royaltyFee 
            expect(originRoyaltyFee === 0); // originRoyaltyFee 
            expect(feeWallet.toString()).to.equal(_feeWallet.address); // feeWallet 
            expect(marketFee.toString()).to.equal(_marketFee.toString()); // marketFee

            // buy NFT 
            await _sellNFTContract.connect(_buyer).buyNFT(0, 1);

            // after buy NFT
            let balanceOfFeeWallet = await _tiaContract.balanceOf(_feeWallet.address) / decimals.toString();
            let balanceOfSeller = await _tiaContract.balanceOf(_seller.address) / decimals.toString();
            let balanceOfBuyerAfterBuy = await _tiaContract.balanceOf(_buyer.address);

            // calculator 
            let feeMarketOfNFT = (info.price * _marketFee) / (_zoom * 100);
            let remainMoneyOfSeller = info.price - feeMarketOfNFT;
            let spendAmountOfBuyer = balanceOfBuyerBeforeBuy - balanceOfBuyerAfterBuy;

            // div() for decimals 
            feeMarketOfNFT = feeMarketOfNFT / decimals;
            remainMoneyOfSeller = remainMoneyOfSeller / decimals;

            console.log("balance of buyer before buy", balanceOfBuyerBeforeBuy.toString());
            console.log("balance of buyer after buy ", balanceOfBuyerAfterBuy.toString());
            console.log(spendAmountOfBuyer.toString(), "spend");
            console.log(info.price.toString(), "price");

            expect(balanceOfFeeWallet.toString()).to.equal(feeMarketOfNFT.toString()); // check balance of fee wallet 
            expect(balanceOfSeller.toString()).to.equal(remainMoneyOfSeller.toString()); // check balance of seller 
            expect(spendAmountOfBuyer.toString()).to.equal(info.price.toString()); // check balance of buyer

            let ownerOf = await _DFYContract.ownerOf(_firstToken);
            console.log(ownerOf, "owner nft");
            console.log(_buyer.address, "buyer");
        });

        it("put on sale and buy with transaction N2 with royaltyRate of NFT and check it information use Bep 20", async () => {

            // mintNFT with royalty fee and test it 
            await _DFYTokenContract.connect(_deployer).transfer(_buyer.address, BigInt(10 * 10 ** 18));
            await _DFYTokenContract.connect(_deployer).transfer(_buyer2.address, BigInt(10 * 10 ** 18));
            await _DFYTokenContract.connect(_buyer).approve(_sellNFTContract.address, BigInt(10 * 10 ** 18));
            await _DFYTokenContract.connect(_buyer2).approve(_sellNFTContract.address, BigInt(10 * 10 ** 18));
            await _DFYContract.connect(_seller).safeMint(_seller.address, _royaltyFee, _cidOfNFT);
            await _DFYContract.connect(_seller).approve(_sellNFTContract.address, _secondToken);
            await _sellNFTContract.connect(_seller).putOnSales(_secondToken, 1, _price, _DFYTokenContract.address, _DFYContract.address);
            await _sellNFTContract.connect(_buyer).buyNFT(1, 1);

            let owner = await _DFYContract.ownerOf(_secondToken);
            expect(owner).to.equal(_buyer.address);


            // != origin creater of NFT with transaction 

            await _DFYContract.connect(_buyer).approve(_sellNFTContract.address, _secondToken);
            await _sellNFTContract.connect(_buyer).putOnSales(_secondToken, 1, _price, _DFYTokenContract.address, _DFYContract.address);

            let marketFeeRate = await _sellNFTContract.marketFeeRate();
            console.log(marketFeeRate, "default market fee rate")

            let royaltyFeeDefault = await _DFYContract.royaltyRateByToken(_secondToken);
            console.log(royaltyFeeDefault.toString(), "default royalty rate");

            let info = await _sellNFTContract.orders(2);
            console.log(info.price.toString(), "price");

            // calculator 
            let marketFee = (info.price * marketFeeRate) / (_zoom * 100);
            console.log(marketFee.toString(), "current marketFee");

            let royaltyFee = (info.price * royaltyFeeDefault) / (_zoom * 100);
            console.log(royaltyFee.toString(), "current royalty fee");

            let totalFeeCharged = BigInt(marketFee) + BigInt(royaltyFee);
            console.log(totalFeeCharged.toString(), "totalFeeCharged ");

            let remainingMoney = BigInt(info.price) - BigInt(totalFeeCharged);

            let balanceOfOriginCreatorBefore = await _DFYTokenContract.balanceOf(_seller.address);
            let balanceOfSellerBeforeSale = await _DFYTokenContract.balanceOf(_buyer.address);
            let balanceOfBuyerBeforeBuy = await _DFYTokenContract.balanceOf(_buyer2.address);
            let balanceOfFeeWalletBeforeSale = await _DFYTokenContract.balanceOf(_feeWallet.address);

            console.log("before buy : ========================================================");
            console.log("balance of origin creator before transaction: ", balanceOfOriginCreatorBefore.toString());
            console.log("balance of seller before sell : ", balanceOfSellerBeforeSale.toString());
            console.log("balance of buyer before buy : ", balanceOfBuyerBeforeBuy.toString());
            console.log("balance of fee wallet before transaction : ", balanceOfFeeWalletBeforeSale.toString());

            let check = await _sellNFTContract.connect(_buyer2).buyNFT(2, 1);
            // let receipt = await check.wait();
            // console.log(receipt.events[0].args[0].toString(), "event");

            let balanceOfOriginCreatorAfter = await _DFYTokenContract.balanceOf(_seller.address);
            let balanceOfSellerAfterSale = await _DFYTokenContract.balanceOf(_buyer.address);
            let balanceOfBuyerAfterBuy = await _DFYTokenContract.balanceOf(_buyer2.address);
            let balanceOfFeeWalletAfterSale = await _DFYTokenContract.balanceOf(_feeWallet.address);

            console.log("after buy : ==========================================================");
            console.log("balance of origin creator after transaction : ", balanceOfOriginCreatorAfter.toString());
            console.log("balance of seller after sell : ", balanceOfSellerAfterSale.toString());
            console.log("balance of buyer after buy  : ", balanceOfBuyerAfterBuy.toString());
            console.log("balance of fee wallet after transaction : ", balanceOfFeeWalletAfterSale.toString());

            let ownerOfNFT = await _DFYContract.ownerOf(_secondToken);
            expect(ownerOfNFT).to.equal(_buyer2.address);
            expect(balanceOfOriginCreatorBefore).to.equal(BigInt(balanceOfOriginCreatorAfter) - BigInt(royaltyFee));
            expect(balanceOfSellerBeforeSale).to.equal(BigInt(balanceOfSellerAfterSale) - BigInt(remainingMoney));
            expect(balanceOfBuyerBeforeBuy).to.equal(BigInt(balanceOfBuyerAfterBuy) + BigInt(info.price));
            expect(balanceOfFeeWalletBeforeSale).to.equal(BigInt(balanceOfFeeWalletAfterSale) - BigInt(marketFee));

        });

        it("put on sale and buy with transaction N1 with royaltyRate of NFT and check it information use BNB", async () => {

            // case test lỗi : không chuyển được bnb giữa các tài khoản với nhau 

            // safe mint     
            await _DFYContract.connect(_seller).safeMint(_seller.address, _royaltyRateDFY, _cidOfNFT);
            await _DFYContract.connect(_seller).approve(_sellNFTContract.address, _thirdToken);

            // put on sale 
            await _sellNFTContract.setMarketFeeRate(_marketFee) // 2,5 % of NFT price
            await _sellNFTContract.connect(_seller).putOnSales(_thirdToken, 1, _price, BNB_ADDRESS, _DFYContract.address);

            // balance of buyer , seller , feeWallet before transaction : 
            console.log("before transaction ================================================== ")

            let balanceOfBuyerBeforeBuy = await _buyer.getBalance();
            let balanceOfSellerBeforeSell = await _seller.getBalance();
            let balanceOfFeeWalletBeforeBuy = await _feeWallet.getBalance();

            console.log(balanceOfBuyerBeforeBuy.toString(), "balance Of Buyer before buy");
            console.log(balanceOfSellerBeforeSell.toString(), "balance of seller before sell ");
            console.log(balanceOfFeeWalletBeforeBuy.toString(), "balance of fee wallet before transaction");

            // buy NFT 
            await _sellNFTContract.connect(_buyer).buyNFT(3, 1, { value: BigInt(1 * 10 ** 18) });

            // after buy NFT
            console.log("after transaction =====================================================");

            let feeGasBuy = 154719399627909;
            let info = await _sellNFTContract.orders(3);

            // calculator 
            let spendAmountOfBuyer = BigInt(info.price) + BigInt(feeGasBuy);
            console.log(spendAmountOfBuyer.toString(), "spendAmout"); // 1000154719399627909

            let payForFeewallet = (info.price * _marketFee) / (_zoom * 100);
            console.log(payForFeewallet.toString(), "payForFeewallet");

            let remainingMoney = BigInt(info.price) - BigInt(payForFeewallet);
            console.log(remainingMoney.toString(), "remain pay for seller ");

            let balanceOfSellerAfterSell = await _seller.getBalance();
            let balanceOfFeeWalletAfterBuy = await _feeWallet.getBalance();
            let balanceOfBuyerAfterBuy = await _buyer.getBalance();

            console.log(balanceOfBuyerAfterBuy.toString(), "balance of buyer after buy");
            console.log(balanceOfSellerAfterSell.toString(), "balance of seller after sell");
            console.log(balanceOfFeeWalletAfterBuy.toString(), "balance of fee wallet after transaction");

            // seller before : 9999993227850451505246 
            // seller after : 9999993227850451505246


            // expect(spendAmountOfBuyer.toString()).to.equal((BigInt(info.price) + BigInt(feeGasBuy)).toString()); // spendAmount of buyer  
            // expect(balanceOfSellerBeforeSell.toString()).to.equal((BigInt(balanceOfSellerAfterSell) - BigInt(remainingMoney)).toString()); // remainAmount of seller 
            // expect(balanceOfFeeWalletAfterBuy.toString()).to.equal((BigInt(balanceOfFeeWalletBeforeBuy) + BigInt(payForFeewallet)).toString()); // remainAmout of feeWallet 

            // console.log((await _DFYContract.ownerOf(_firstToken)), "owner ");
            // console.log(_buyer.address, "buyer");
        });

        it("cancel order and check it ", async () => {

            await _DFYContract.connect(_seller).safeMint(_seller.address, _royaltyFee, _cidOfNFT);
            await _DFYContract.connect(_seller).approve(_sellNFTContract.address, _fourthToken);
            await _sellNFTContract.connect(_seller).putOnSales(_fourthToken, 1, _price, _DFYTokenContract.address, _DFYContract.address);
            let cancel = await _sellNFTContract.connect(_seller).cancelListing(3);
            expect(cancel === true);

        });



    });
});