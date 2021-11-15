const hre = require("hardhat");
const artifactDFYFactory = "DefiForYouNFTFactory";
const artifactDFY = "DefiForYouNFT";
const artifactTia = "TiaToken";
const artifactSellNFT = "SellNFT";
const { expect, assert } = require("chai");
const BNB_ADDRESS = "0x0000000000000000000000000000000000000000";
const decimals = 10 ** 18;



describe("Deploy DFY Factory", (done) => {

    let _DFYFactoryContract = null;
    let _DFYContract = null;
    let _tiaContract = null;
    let _sellNFTContract = null;

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
            _notOriginCreater,
            _buyer,
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
            let balanceOfSeller = await _tiaContract.balanceOf(_seller.address);
            let balanceOfFeeWallet = await _tiaContract.balanceOf(_feeWallet.address);
            let balanceOfBuyer = await _tiaContract.balanceOf(_buyer.address);

            // check balance 
            console.log("balance of all after transaction : ");
            // console.log(balanceOfSeller.toString(), "seller");
            // console.log(balanceOfFeeWallet.toString(), "fee wallet");
            // console.log(balanceOfBuyer.toString(), "buyer ");

            let _balanceOfWallet = BigInt(1 * 10 ** 18 * 25 / 1000);
            let _balanceOfSeller = BigInt(info.price - 1 * 10 ** 18 * 25 / 1000);

            expect(balanceOfFeeWallet).to.equal(_balanceOfWallet.toString());
            expect(_balanceOfSeller.toString()).to.equal(balanceOfSeller.toString());
        });


        // it("put on sale and buy with transaction N1 with royaltyRate of NFT and check it information use BNB", async () => {

        //     // create collection 2 
        //     await _DFYFactoryContract.connect(_seller).createCollection(_tokenName, _symbol, _royaltyRateFactory, _cidOfCollection.toString());
        //     this.DFYNFTFactory2 = await hre.ethers.getContractFactory("DefiForYouNFT");
        //     let getAddressContractOfCreatetor2 = await _DFYFactoryContract.collectionsByOwner(_seller.address, 1);
        //     _DFYContract = this.DFYNFTFactory.attach(getAddressContractOfCreatetor2);

        //     // safe mint     
        //     await _DFYContract.connect(_seller).safeMint(_seller.address, _royaltyRateDFY, _cidOfNFT);
        //     await _DFYContract.connect(_seller).approve(_sellNFTContract.address, _firstToken);

        //     // put on sale 
        //     let price = 1 * 10 ** 18 / decimals;
        //     let marketFee = 2.5 * 10 ** 5; // không dùng được số decimal cho  market fee -> = 250.000 -> cách tính fee = 250.000 <=> 2,5 % 


        //     await _sellNFTContract.setMarketFee(marketFee) // 2,5 % of NFT price
        //     await _sellNFTContract.connect(_seller).putOnSales(_firstToken, _price, BNB_ADDRESS, _DFYContract.address);

        //     // balance of buyer , seller , feeWallet before transaction : 
        //     console.log("before transaction ================================================== ")
        //     console.log("balance of buyer : ", ((await _notOriginCreater.getBalance() / decimals)).toString()); // 9999.99970380835
        //     console.log("balance of seller : ", ((await _seller.getBalance() / decimals)).toString()) // 9999.992623663818
        //     console.log("balance of FeeWallet : ", ((await _feeWallet.getBalance() / decimals)).toString()) // 10000

        //     let balanceOfBuyerBeforeBuy = await _notOriginCreater.getBalance();  // 9999.99970380835
        //     balanceOfBuyerBeforeBuy = balanceOfBuyerBeforeBuy / decimals;

        //     let balanceOfSellerBeforeSell = await _seller.getBalance();
        //     balanceOfSellerBeforeSell = balanceOfSellerBeforeSell / decimals;

        //     let balanceOfFeeWalletBeforeBuy = await _feeWallet.getBalance();
        //     balanceOfFeeWalletBeforeBuy = balanceOfFeeWalletBeforeBuy / decimals;

        //     console.log(balanceOfBuyerBeforeBuy, "buyer before"); // 9999.999703823763
        //     console.log(balanceOfSellerBeforeSell, "seller before");
        //     console.log(balanceOfFeeWalletBeforeBuy, "Fee Wallet before");

        //     // buy NFT 
        //     await _sellNFTContract.connect(_notOriginCreater).buyNFT(1, { value: BigInt(1 * 10 ** 18) });

        //     // after buy NFT
        //     console.log("after transaction =====================================================");

        //     let feeGasBuy = 154326853000000 / decimals;
        //     marketFee = 25000000000000000; // price * 25 / 1000 = 25000000000000000
        //     marketFee = marketFee / decimals;

        //     console.log(marketFee.toString(), "market fee");
        //     // buyer 
        //     let balanceOfBuyerAfterBuy = await _notOriginCreater.getBalance();
        //     balanceOfBuyerAfterBuy = balanceOfBuyerAfterBuy / decimals;

        //     // seller 
        //     let balanceOfSellerAfterSell = await _seller.getBalance();
        //     balanceOfSellerAfterSell = balanceOfSellerAfterSell / decimals;

        //     // FeeWallet 
        //     let balanceOfFeeWalletAfterBuy = await _feeWallet.getBalance();
        //     balanceOfFeeWalletAfterBuy = balanceOfFeeWalletAfterBuy / decimals;

        //     balanceOfFeeWalletBeforeBuy = balanceOfFeeWalletAfterBuy - marketFee;
        //     console.log(balanceOfFeeWalletBeforeBuy, "sadsadsadsad");

        //     console.log(balanceOfBuyerAfterBuy, "buyer after");
        //     console.log(balanceOfSellerAfterSell, "seller after");
        //     console.log(balanceOfFeeWalletAfterBuy, "fee wallet after");

        //     let remainMoney = balanceOfSellerAfterSell - balanceOfSellerBeforeSell;

        //     expect(balanceOfSellerBeforeSell).to.equal(balanceOfSellerAfterSell - remainMoney);
        //     expect(balanceOfBuyerBeforeBuy).to.equal(balanceOfBuyerAfterBuy + (feeGasBuy + price));
        //     expect(balanceOfFeeWalletBeforeBuy).to.equal(balanceOfFeeWalletAfterBuy - marketFee);
        //     // clear lại , marketFee ban đầu set là 2.5 * 10 ** 5 = 250.000 trong khi tính 2,5 của price là 25000000000000000 wei
        // });

        // it("put on sale and buy with transaction N2 with royaltyRate of NFT and check it information use BNB", async () => {

        //     // != origin creater of NFT with transaction 


        //     // create collection 3
        //     await _DFYFactoryContract.connect(_seller).createCollection(_tokenName, _symbol, _royaltyRateFactory, _cidOfCollection.toString());
        //     this.DFYNFTFactory2 = await hre.ethers.getContractFactory("DefiForYouNFT");
        //     let getAddressContractOfCreatetor3 = await _DFYFactoryContract.collectionsByOwner(_seller.address, 2);
        //     _DFYContract = this.DFYNFTFactory.attach(getAddressContractOfCreatetor3);

        //     // safe mint 
        //     await _DFYContract.connect(_seller).safeMint(_seller.address, _royaltyRateDFY, _cidOfNFT);
        //     await _DFYContract.connect(_seller).approve(_sellNFTContract.address, _firstToken);

        //     // put on sale 
        //     let price = 1 * 10 ** 18 / decimals;
        //     let marketFee = 2.5 * 10 ** 5; // không dùng được số decimal cho  market fee -> = 250.000

        //     await _sellNFTContract.setMarketFee(marketFee) // 2,5 % of NFT price
        //     await _sellNFTContract.connect(_seller).putOnSales(_firstToken, _price, BNB_ADDRESS, _DFYContract.address);

        //     console.log("before transaction ================================================== ");
        //     console.log("balance of buyer : ", ((await _buyer.getBalance() / decimals)).toString());
        //     console.log("balance of seller : ", ((await _seller.getBalance() / decimals)).toString());
        //     console.log("balance of FeeWallet : ", ((await _seller.getBalance() / decimals)).toString());

        // });

    });
});