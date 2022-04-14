require('@nomiclabs/hardhat-ethers');

const hre = require('hardhat');
const { Proxies } = require('./.deployment_data_test.json');
const proxiesEnv = Proxies.Staging;

const decimals = 10 ** 18;

const CollectionMgrBuildName = "DefiForYouNFTFactory";
const HubBuildName = "Hub";
const HubProxy = proxiesEnv.HUB_ADDRESS;

const proxyType = { kind: "uups" };

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("============================================================\n\r");
    console.log("Start time: ", Date(Date.now()));
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
    console.log("============================================================\n\r");
    
    const CollectionMgrFactory = await hre.ethers.getContractFactory(CollectionMgrBuildName);
    const CollectionMgrArtifact = await hre.artifacts.readArtifact(CollectionMgrBuildName);
    const CollectionMgrContract = await hre.upgrades.deployProxy(CollectionMgrFactory, [HubProxy], proxyType);

    await CollectionMgrContract.deployed();
    const signature  = await CollectionMgrContract.signature();

    console.log(`NFT_FACTORY_ADDRESS: \x1b[36m${CollectionMgrContract.address}\x1b[0m`);
    console.log(`Signature: \x1b[36m${signature}\x1b[0m`);

    const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(CollectionMgrContract.address);
    console.log(`\x1b[36m${CollectionMgrArtifact.contractName}\x1b[0m implementation address: \x1b[36m${implementationAddress}\x1b[0m\n\r`);

    const HubFactory   = await hre.ethers.getContractFactory(HubBuildName);
    const HubArtifact  = await hre.artifacts.readArtifact(HubBuildName);
    const HubContract  = HubFactory.attach(HubProxy);

    console.log(`HUB_ADDRESS: \x1b[31m${HubContract.address}\x1b[0m`);
    console.log(`Registering \x1b[36m${CollectionMgrArtifact.contractName}\x1b[0m to \x1b[31m${HubArtifact.contractName}\x1b[0m...`);
    
    await HubContract.registerContract(signature, CollectionMgrContract.address, CollectionMgrArtifact.contractName);
    console.log(`Completed at ${Date(Date.now())}`);

    console.log("============================================================\n\r");
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });