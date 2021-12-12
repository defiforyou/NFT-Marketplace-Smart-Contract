require('@nomiclabs/hardhat-ethers');
const hre = require('hardhat');

const { Proxies, HubSettings } = require('./.deployment_data_prelive.json');
const proxiesEnv = Proxies.Prelive;

const HubProxyAddr     = proxiesEnv.HUB_ADDRESS;
const HubBuildName     = "contracts/hub/Hub.sol:Hub";

const decimals          = 10**18;

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("============================================================");
    console.log("Start time: ", Date(Date.now()));
    console.log(`Initialize contracts with the account: ${deployer.address}`);  
    console.log("Account balance:", ((await deployer.getBalance())/decimals).toString());
    console.log("============================================================");

    const HubFactory   = await hre.ethers.getContractFactory(HubBuildName);
    const HubArtifact  = await hre.artifacts.readArtifact(HubBuildName);
    const HubContract  = HubFactory.attach(HubProxyAddr);

    console.log(`Applying roles on \x1b[31m${HubArtifact.contractName}\x1b[0m at \x1b[31m${HubContract.address}\x1b[0m\n\r`);

    // Grant DEFAULT_ADMIN_ROLE to Admin wallet
    console.log(`Granting DEFAULT_ADMIN_ROLE to Admin wallet \x1b[31m${HubSettings.SystemAdmin}\x1b[0m...`);
    await HubContract.grantRole(HubSettings.ADMIN_ROLE, HubSettings.SystemAdmin);

    // Grant PAUSER_ROLE to Admin wallet
    console.log(`Granting PAUSER_ROLE to Admin wallet \x1b[31m${HubSettings.SystemAdmin}\x1b[0m...`);
    await HubContract.grantRole(HubSettings.PAUSER_ROLE, HubSettings.SystemAdmin);

    // Grant REGISTRANT to Admin wallet
    console.log(`Granting REGISTRANT role to Admin wallet \x1b[31m${HubSettings.SystemAdmin}\x1b[0m...`);
    await HubContract.grantRole(HubSettings.REGISTRANT_ROLE, HubSettings.SystemAdmin);

    // Renounce DEFAULT_ADMIN_ROLE from deployer wallet
    console.log(`Renouncing DEFAULT_ADMIN_ROLE from Deployer wallet \x1b[31m${deployer.address}\x1b[0m...`);
    await HubContract.renounceRole(HubSettings.ADMIN_ROLE, deployer.address);
    
    // Renounce PAUSER_ROLE from deployer wallet
    console.log(`Renouncing PAUSER_ROLE from Deployer wallet \x1b[31m${deployer.address}\x1b[0m...`);
    await HubContract.renounceRole(HubSettings.PAUSER_ROLE, deployer.address);

    // Renounce REGISTRANT from deployer wallet
    console.log(`Renouncing REGISTRANT from Deployer wallet \x1b[31m${deployer.address}\x1b[0m...`);
    await HubContract.renounceRole(HubSettings.REGISTRANT_ROLE, deployer.address);

    console.log(`\n\r`);
    console.log(`Completed at ${Date(Date.now())}`);

    console.log("============================================================\n\r");

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });