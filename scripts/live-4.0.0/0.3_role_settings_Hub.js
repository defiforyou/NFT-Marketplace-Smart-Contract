require('@nomiclabs/hardhat-ethers');
const hre = require('hardhat');

const { Proxies, HubSettings } = require('./.deployment_data_live.json');
const proxiesEnv = Proxies.Live;

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

    let tnx, receipt;

    console.log(`Applying roles on \x1b[31m${HubArtifact.contractName}\x1b[0m at \x1b[31m${HubContract.address}\x1b[0m\n\r`);

    if(HubSettings.Operators.length > 0) {
        console.log(`Setting additional Operator accounts...`);
        for await (let account of HubSettings.Operators) {
            tnx = await HubContract.grantRole(HubSettings.OPERATOR_ROLE, account.Address);
            receipt = await tnx.wait();

            console.log(`\t${account.Name}: \x1b[31m${account.Address}\x1b[0m`);
        }
        console.log(`==========\n\r`);
    }

    if(HubSettings.Registrants.length > 0) {
        console.log(`Setting Registrant accounts...`);
        for await (let account of HubSettings.Registrants) {
            tnx = await HubContract.grantRole(HubSettings.REGISTRANT_ROLE, account.Address);
            receipt = await tnx.wait();

            console.log(`\t${account.Name}: \x1b[31m${account.Address}\x1b[0m`);
        }
        console.log(`==========\n\r`);
    }

    // Grant DEFAULT_ADMIN_ROLE to Admin wallet
    console.log(`Granting DEFAULT_ADMIN_ROLE to Admin wallet \x1b[31m${HubSettings.SystemAdmin}\x1b[0m...`);
    tnx = await HubContract.grantRole(HubSettings.ADMIN_ROLE, HubSettings.SystemAdmin);
    receipt = await tnx.wait();

    // Grant PAUSER_ROLE to Admin wallet
    console.log(`Granting PAUSER_ROLE to Admin wallet \x1b[31m${HubSettings.SystemAdmin}\x1b[0m...`);
    tnx = await HubContract.grantRole(HubSettings.PAUSER_ROLE, HubSettings.SystemAdmin);
    receipt = await tnx.wait();

    // Grant REGISTRANT to Admin wallet
    console.log(`Granting REGISTRANT role to Admin wallet \x1b[31m${HubSettings.SystemAdmin}\x1b[0m...`);
    tnx = await HubContract.grantRole(HubSettings.REGISTRANT_ROLE, HubSettings.SystemAdmin);
    receipt = await tnx.wait();

    // Renounce REGISTRANT from deployer wallet
    console.log(`Renouncing REGISTRANT from Deployer wallet \x1b[31m${deployer.address}\x1b[0m...`);
    tnx = await HubContract.renounceRole(HubSettings.REGISTRANT_ROLE, deployer.address);
    receipt = await tnx.wait();
    
    // Renounce PAUSER_ROLE from deployer wallet
    console.log(`Renouncing PAUSER_ROLE from Deployer wallet \x1b[31m${deployer.address}\x1b[0m...`);
    tnx = await HubContract.renounceRole(HubSettings.PAUSER_ROLE, deployer.address);
    receipt = await tnx.wait();

    // Renounce DEFAULT_ADMIN_ROLE from deployer wallet
    console.log(`Renouncing DEFAULT_ADMIN_ROLE from Deployer wallet \x1b[31m${deployer.address}\x1b[0m...`);
    tnx = await HubContract.renounceRole(HubSettings.ADMIN_ROLE, deployer.address);
    receipt = await tnx.wait();

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