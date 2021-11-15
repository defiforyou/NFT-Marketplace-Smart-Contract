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
    let _marketFee = 2.5 * 10 ** 5; // 2,5 % 
    let _price = BigInt(1 * 10 ** 18);
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
        const sellNFTContract = await sellNFTFactory.deploy();
        _sellNFTContract = await sellNFTContract.deployed();

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

            // // safe mint 
            await _DFYContract.connect(_seller).safeMint(_seller.address, 0, _cidOfNFT);
            await _DFYContract.connect(_seller).approve(_sellNFTContract.address, _firstToken);

            // // put on sale 
            await _sellNFTContract.connect(_deployer).setFeeWallet(_feeWallet.address);
            await _sellNFTContract.connect(_deployer).setMarketFee(_marketFee);
            await _sellNFTContract.connect(_seller).putOnSales(_firstToken, _price, _tiaContract.address, _DFYContract.address);

            let spenderOfNFT = await _DFYContract.ownerOf(_firstToken);
            let originRoyaltyFee = await _DFYContract.royaltyRateByToken(_firstToken);
            let marketFee = await _sellNFTContract.marketFee();
            let info = await _sellNFTContract.orderOf(0);
            let feeWallet = await _sellNFTContract.walletFeeMarket();
            let balanceOfBuyerBeforeBuy = await _tiaContract.balanceOf(_buyer.address);


            expect(spenderOfNFT === true); // spender 
            expect(info.currency.toString()).to.equal(_tiaContract.address); // currency
            expect(info.collectionAddress.toString().toString()).to.equal(_DFYContract.address); // collectionAddress 
            expect(info.royaltyFee === 0); // royaltyFee 
            expect(originRoyaltyFee === 0); // originRoyaltyFee 
            expect(feeWallet.toString()).to.equal(_feeWallet.address); // feeWallet 
            expect(marketFee.toString()).to.equal(_marketFee.toString()); // marketFee

            // buy NFT 
            await _sellNFTContract.connect(_buyer).buyNFT(0);

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

        });


        it("put on sale and buy with transaction N1 with royaltyRate of NFT and check it information use BNB", async () => {

            // create collection 2 
            await _DFYFactoryContract.connect(_seller).createCollection(_tokenName, _symbol, _royaltyRateFactory, _cidOfCollection.toString());
            this.DFYNFTFactory2 = await hre.ethers.getContractFactory("DefiForYouNFT");
            let getAddressContractOfCreatetor2 = await _DFYFactoryContract.collectionsByOwner(_seller.address, 1);
            _DFYContract = this.DFYNFTFactory.attach(getAddressContractOfCreatetor2);

            // safe mint     
            await _DFYContract.connect(_seller).safeMint(_seller.address, _royaltyRateDFY, _cidOfNFT);
            await _DFYContract.connect(_seller).approve(_sellNFTContract.address, _firstToken);

            // put on sale 

            await _sellNFTContract.setMarketFee(_marketFee) // 2,5 % of NFT price
            await _sellNFTContract.connect(_seller).putOnSales(_firstToken, _price, BNB_ADDRESS, _DFYContract.address);

            // balance of buyer , seller , feeWallet before transaction : 
            console.log("before transaction ================================================== ")
            console.log("balance of buyer : ", ((await _buyer.getBalance() / decimals)).toString()); // 9999.99970380835
            console.log("balance of seller : ", ((await _seller.getBalance() / decimals)).toString()) // 9999.992623663818
            console.log("balance of FeeWallet : ", ((await _feeWallet.getBalance() / decimals)).toString()) // 10000

            let balanceOfBuyerBeforeBuy = await _buyer.getBalance();
            let balanceOfSellerBeforeSell = await _seller.getBalance();
            let balanceOfFeeWalletBeforeBuy = await _feeWallet.getBalance();

            console.log(balanceOfBuyerBeforeBuy.toString(), "buyer before");
            console.log(balanceOfSellerBeforeSell.toString(), "seller before");
            console.log(balanceOfFeeWalletBeforeBuy.toString(), "Fee Wallet before");

            // buy NFT 
            await _sellNFTContract.connect(_buyer).buyNFT(1, { value: BigInt(1 * 10 ** 18) });

            // after buy NFT
            console.log("after transaction =====================================================");

            let feeGasBuy = 154719399627909;
            let info = await _sellNFTContract.orderOf(1);

            // calculator 
            let spendAmountOfBuyer = BigInt(info.price) + BigInt(feeGasBuy);
            console.log(spendAmountOfBuyer.toString(), "spendAmout");

            let payForFeewallet = (info.price * _marketFee) / (_zoom * 100);
            console.log(payForFeewallet.toString(), "pay");

            let remainingMoney = BigInt(info.price) - BigInt(payForFeewallet);
            console.log(remainingMoney.toString(), "remain ");

            let balanceOfSellerAfterSell = await _seller.getBalance();
            let balanceOfFeeWalletAfterBuy = await _feeWallet.getBalance();
            let balanceOfBuyerAfterBuy = await _buyer.getBalance();

            console.log(balanceOfBuyerAfterBuy.toString(), "buyer after");
            console.log(balanceOfSellerAfterSell.toString(), "seller after");
            console.log(balanceOfFeeWalletAfterBuy.toString(), "fee wallet after");

            expect(spendAmountOfBuyer.toString()).to.equal((BigInt(info.price) + BigInt(feeGasBuy)).toString()); // spendAmount of buyer  
            expect(balanceOfSellerBeforeSell.toString()).to.equal((BigInt(balanceOfSellerAfterSell) - BigInt(remainingMoney)).toString()); // remainAmount of seller 
            expect(balanceOfFeeWalletAfterBuy.toString()).to.equal((BigInt(balanceOfFeeWalletBeforeBuy) + BigInt(payForFeewallet)).toString()); // remainAmout of feeWallet 

        });

        it("put on sale and buy with transaction N2 with royaltyRate of NFT and check it information use Bep 20", async () => {

            // != origin creater of NFT with transaction 

            // await _sellNFTContract.connect(_buyer).putOnSales(_firstToken, _price, , _DFYContract.address);

            // await _DFYTokenContract.transfer()


        });

    });
});