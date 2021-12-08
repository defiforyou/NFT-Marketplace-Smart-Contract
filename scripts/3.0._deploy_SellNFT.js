require('@nomiclabs/hardhat-ethers');

const hre = require('hardhat');
const { Proxies } = require('./.deployment_data_test.json');
const decimals = 10 ** 18;

const NFTSalesBuildName = "SellNFT";
const HubBuildName = "Hub";
const HubProxy = Proxies.Staging.HUB_ADDRESS;

const proxyType = { kind: "uups" };

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("============================================================\n\r");
    console.log("Start time: ", Date(Date.now()));
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
    console.log("============================================================\n\r");
    
    const NFTSalesFactory = await hre.ethers.getContractFactory(NFTSalesBuildName);
    const NFTSalesArtifact = await hre.artifacts.readArtifact(NFTSalesBuildName);
    const NFTSalesContract = await hre.upgrades.deployProxy(NFTSalesFactory, [HubProxy], proxyType);

    await NFTSalesContract.deployed();
    const signature  = await NFTSalesContract.signature();

    console.log(`NFT_SALES_ADDRESS: \x1b[36m${NFTSalesContract.address}\x1b[0m`);
    console.log(`Signature: \x1b[36m${signature}\x1b[0m`);

    const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(NFTSalesContract.address);
    console.log(`\x1b[36m${NFTSalesArtifact.contractName}\x1b[0m implementation address: \x1b[36m${implementationAddress}\x1b[0m\n\r`);

    const HubFactory   = await hre.ethers.getContractFactory(HubBuildName);
    const HubArtifact  = await hre.artifacts.readArtifact(HubBuildName);
    const HubContract  = HubFactory.attach(HubProxy);

    console.log(`HUB_ADDRESS: \x1b[31m${HubContract.address}\x1b[0m`);
    console.log(`Registering \x1b[36m${NFTSalesArtifact.contractName}\x1b[0m to \x1b[31m${HubArtifact.contractName}\x1b[0m...`);
    
    await HubContract.registerContract(signature, NFTSalesContract.address, NFTSalesArtifact.contractName);
    console.log(`Completed at ${Date(Date.now())}`);

    console.log("============================================================\n\r");
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });