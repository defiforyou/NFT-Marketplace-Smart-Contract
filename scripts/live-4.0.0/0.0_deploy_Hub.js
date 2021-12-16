require('@nomiclabs/hardhat-ethers');

const hre = require('hardhat');
const { HubSettings } = require('./.deployment_data_live.json');

const decimals = 10 ** 18;

const HubBuildName = "Hub";

const proxyType = { kind: "uups" };


async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("============================================================\n\r");
    console.log("Start time: ", Date(Date.now()));
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
    console.log("============================================================\n\r");
    
    const HubFactory = await hre.ethers.getContractFactory(HubBuildName);
    const HubArtifact = await hre.artifacts.readArtifact(HubBuildName);
    const HubContract = await hre.upgrades.deployProxy(
        HubFactory,
        [
            HubSettings.SystemFeeWallet,
            HubSettings.SystemFeeToken,
            HubSettings.SystemOperator
        ],
        proxyType);

    await HubContract.deployed();

    console.log(`HUB_ADDRESS: \x1b[31m${HubContract.address}\x1b[0m`);

    const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(HubContract.address);
    console.log(`\x1b[31m${HubArtifact.contractName}\x1b[0m implementation address: \x1b[31m${implementationAddress}\x1b[0m\n\r`);

    console.log(`Completed at ${Date(Date.now())}`);

    console.log("============================================================\n\r");
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });