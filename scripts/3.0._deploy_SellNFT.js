require('@nomiclabs/hardhat-ethers');

const hre = require('hardhat');
const { DefaultSettings } = require('./.deployment_data_test.json');
const decimals = 10 ** 18;

const NFTSalesBuildName = "SellNFT";

const proxyType = { kind: "uups" };


async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("============================================================\n\r");
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
    console.log("============================================================\n\r");
    const NFTSalesFactory = await hre.ethers.getContractFactory(NFTSalesBuildName);
    const NFTSalesArtifact = await hre.artifacts.readArtifact(NFTSalesBuildName);
    const NFTSalesContract = await hre.upgrades.deployProxy(NFTSalesFactory, [DefaultSettings.ZOOM], proxyType);

    await NFTSalesContract.deployed();

    console.log(`NFT_SALES_ADDRESS: ${NFTSalesContract.address}`);

    implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(NFTSalesContract.address);
    console.log(`${NFTSalesArtifact.contractName} implementation address: ${implementationAddress}`);

    console.log("============================================================\n\r");
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });