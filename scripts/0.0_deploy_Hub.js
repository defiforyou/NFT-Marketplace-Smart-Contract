require('@nomiclabs/hardhat-ethers');

const hre = require('hardhat');
const { HubSettings } = require('./.deployment_data_test.json');
const decimals = 10 ** 18;

const HubBuildName = "Hub";

const proxyType = { kind: "uups" };


async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("============================================================\n\r");
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
    console.log("============================================================\n\r");
    const HubFactory = await hre.ethers.getContractFactory(HubBuildName);
    const HubArtifact = await hre.artifacts.readArtifact(HubBuildName);
    const HubContract = await hre.upgrades.deployProxy(
        HubFactory, 
        [
            HubSettings.SystemFeeWallet, 
            HubSettings.SystemFeeToken
        ], 
        proxyType);

    await HubContract.deployed();

    console.log(`HUB_ADDRESS: ${HubContract.address}`);

    implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(HubContract.address);
    console.log(`${HubArtifact.contractName} implementation address: ${implementationAddress}`);

    console.log("============================================================\n\r");
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });