require('@nomiclabs/hardhat-ethers');

const { Proxies } = require('./.deployment_data_test.json');
const proxies = Proxies.Test1;

const CollectionMgrProxyAddr = proxies.NFT_FACTORY_ADDRESS;
const CollectionMgrBuildName = "DefiForYouNFTFactory";

const decimals      = 10**18;

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    
    console.log("============================================================\n\r");
    console.log("Upgrading contracts with the account:", deployer.address);  
    console.log("Account balance:", ((await deployer.getBalance())/decimals).toString());
    console.log("============================================================\n\r");

    const CollectionMgrFactoryV1     = await hre.ethers.getContractFactory(CollectionMgrBuildName);
    const CollectionMgrArtifactV1    = await hre.artifacts.readArtifact(CollectionMgrBuildName);
    const CollectionMgrContractV1    = CollectionMgrFactoryV1.attach(CollectionMgrProxyAddr);

    const CollectionMgrImplV1        = await hre.upgrades.erc1967.getImplementationAddress(CollectionMgrContractV1.address);

    console.log(`Upgrading ${CollectionMgrArtifactV1.contractName} at proxy: ${CollectionMgrContractV1.address}`);
    console.log(`Current implementation address: ${CollectionMgrImplV1}`);

    const CollectionMgrFactoryV2     = await hre.ethers.getContractFactory(CollectionMgrBuildName);
    const CollectionMgrArtifactV2    = await hre.artifacts.readArtifact(CollectionMgrBuildName);
    const CollectionMgrContractV2    = await hre.upgrades.upgradeProxy(CollectionMgrContractV1, CollectionMgrFactoryV2);
    
    await CollectionMgrContractV2.deployed();
    
    const CollectionMgrImplV2    = await hre.upgrades.erc1967.getImplementationAddress(CollectionMgrContractV2.address);

    console.log(`${CollectionMgrArtifactV2.contractName} deployed to: ${CollectionMgrContractV2.address}`);
    console.log(`New implementation Address: ${CollectionMgrImplV2}`);

    console.log("============================================================\n\r");
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });