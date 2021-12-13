require('@nomiclabs/hardhat-ethers');
const hre = require('hardhat');

const { Proxies } = require('./.deployment_data_prelive.json');
const proxiesEnv = Proxies.Prelive;

const HubProxyAddr = proxiesEnv.HUB_ADDRESS;
const HubBuildName = "Hub";

const decimals      = 10**18;

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    
    console.log("============================================================\n\r");
    console.log("Upgrading contracts with the account:", deployer.address);  
    console.log("Account balance:", ((await deployer.getBalance())/decimals).toString());
    console.log("============================================================\n\r");

    const HubFactoryV1     = await hre.ethers.getContractFactory(HubBuildName);
    const HubArtifactV1    = await hre.artifacts.readArtifact(HubBuildName);
    const HubContractV1    = HubFactoryV1.attach(HubProxyAddr);

    const HubImplV1        = await hre.upgrades.erc1967.getImplementationAddress(HubContractV1.address);

    console.log(`Upgrading \x1b[31m${HubArtifactV1.contractName} at proxy: \x1b[31m${HubContractV1.address}\x1b[0m`);
    console.log(`Current implementation address: \x1b[31m${HubImplV1}\x1b[0m`);

    const HubFactoryV2     = await hre.ethers.getContractFactory(HubBuildName);
    const HubArtifactV2    = await hre.artifacts.readArtifact(HubBuildName);
    const HubContractV2    = await hre.upgrades.upgradeProxy(HubContractV1, HubFactoryV2);
    
    await HubContractV2.deployed();
    
    const HubImplV2    = await hre.upgrades.erc1967.getImplementationAddress(HubContractV2.address);

    console.log(`\x1b[31m${HubArtifactV2.contractName}\x1b[0m deployed to: \x1b[31m${HubContractV2.address}\x1b[0m`);
    console.log(`New implementation Address: \x1b[31m${HubImplV2}\x1b[0m\n\r`);
    console.log(`Completed at ${Date(Date.now())}`);

    console.log("============================================================\n\r");
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });