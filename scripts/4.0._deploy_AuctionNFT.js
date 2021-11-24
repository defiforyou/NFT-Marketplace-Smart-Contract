require('@nomiclabs/hardhat-ethers');

const hre = require('hardhat');
const { DefaultSettings, Proxies } = require('./.deployment_data_test.json');
const decimals = 10 ** 18;

const NFTSalesBuildName = "AuctionNFT";

const proxyType = { kind: "uups" };

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("============================================================\n\r");
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
    console.log("============================================================\n\r");
    const NFTAuctionFactory = await hre.ethers.getContractFactory(NFTSalesBuildName);
    const NFTAuctionArtifact = await hre.artifacts.readArtifact(NFTSalesBuildName);
    const NFTAuctionContract = await hre.upgrades.deployProxy(NFTAuctionFactory, [Proxies.Dev2.HUB_ADDRESS], proxyType);

    await NFTAuctionContract.deployed();

    console.log(`NFT_AUCTION_ADDRESS: ${NFTAuctionContract.address}`);

    implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(NFTAuctionContract.address);
    console.log(`${NFTAuctionArtifact.contractName} implementation address: ${implementationAddress}`);

    console.log("============================================================\n\r");
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });