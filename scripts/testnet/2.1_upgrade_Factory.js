require('@nomiclabs/hardhat-ethers');
const hre = require('hardhat');

const { Proxies } = require('./.deployment_data_test.json');
const proxiesEnv = Proxies.Beta;

const CollectionMgrProxyAddr = proxiesEnv.NFT_FACTORY_ADDRESS;
const CollectionMgrBuildName = "DefiForYouNFTFactory";

const decimals      = 10**18;

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    
    console.log("============================================================\n\r");
    console.log("Start time: ", Date(Date.now()));
    console.log("Upgrading contracts with the account:", deployer.address);  
    console.log("Account balance:", ((await deployer.getBalance())/decimals).toString());
    console.log("============================================================\n\r");

    const CollectionMgrFactoryV1     = await hre.ethers.getContractFactory(CollectionMgrBuildName);
    const CollectionMgrArtifactV1    = await hre.artifacts.readArtifact(CollectionMgrBuildName);
    const CollectionMgrContractV1    = CollectionMgrFactoryV1.attach(CollectionMgrProxyAddr);
    
    const currentSignature           = await CollectionMgrContractV1.signature();

    const CollectionMgrImplV1        = await hre.upgrades.erc1967.getImplementationAddress(CollectionMgrContractV1.address);

    console.log(`Upgrading \x1b[36m${CollectionMgrArtifactV1.contractName}\x1b[0m at proxy: \x1b[36m${CollectionMgrContractV1.address}\x1b[0m`);
    console.log(`Current implementation address: \x1b[36m${CollectionMgrImplV1}\x1b[0m`);
    console.log(`Current contract SIGNATURE: \x1b[36m${currentSignature}\x1b[0m\n\r`);

    const CollectionMgrFactoryV2     = await hre.ethers.getContractFactory(CollectionMgrBuildName);
    const CollectionMgrArtifactV2    = await hre.artifacts.readArtifact(CollectionMgrBuildName);
    const CollectionMgrContractV2    = await hre.upgrades.upgradeProxy(CollectionMgrContractV1, CollectionMgrFactoryV2);
    
    await CollectionMgrContractV2.deployed();
    const newSignature  = await CollectionMgrContractV2.signature();
    
    const CollectionMgrImplV2    = await hre.upgrades.erc1967.getImplementationAddress(CollectionMgrContractV2.address);

    console.log(`\x1b[36m${CollectionMgrArtifactV2.contractName}\x1b[0m deployed to: \x1b[36m${CollectionMgrContractV2.address}\x1b[0m`);
    console.log(`New implementation Address: \x1b[36m${CollectionMgrImplV2}\x1b[0m`);
    console.log(`New contract SIGNATURE: \x1b[36m${newSignature}\x1b[0m ${newSignature == currentSignature ? "(Signature unchanged)": ""}\n\r`);
    
    console.log(`Completed at ${Date(Date.now())}`);

    console.log("============================================================\n\r");
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });