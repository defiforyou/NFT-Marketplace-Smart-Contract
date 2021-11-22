require('@nomiclabs/hardhat-ethers');

const { Proxies } = require('./.deployment_data_test.json');
const proxies = Proxies.Dev2;

const HubProxyAddr = proxies.HUB_ADDRESS;
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

    console.log(`Upgrading ${HubArtifactV1.contractName} at proxy: ${HubContractV1.address}`);
    console.log(`Current implementation address: ${HubImplV1}`);

    const HubFactoryV2     = await hre.ethers.getContractFactory(HubBuildName);
    const HubArtifactV2    = await hre.artifacts.readArtifact(HubBuildName);
    const HubContractV2    = await hre.upgrades.upgradeProxy(HubContractV1, HubFactoryV2);
    
    await HubContractV2.deployed();
    
    const HubImplV2    = await hre.upgrades.erc1967.getImplementationAddress(HubContractV2.address);

    console.log(`${HubArtifactV2.contractName} deployed to: ${HubContractV2.address}`);
    console.log(`New implementation Address: ${HubImplV2}`);

    console.log("============================================================\n\r");
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });