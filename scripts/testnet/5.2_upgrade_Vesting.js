require('@nomiclabs/hardhat-ethers');

const { Proxies } = require('./.deployment_data_test.json');
const proxiesEnv = Proxies.Staging;

const VestingProxyAddr = proxiesEnv.VESTING_ADDRESS;
const VestingBuildNameV1 = "Vesting";
const VestingBuildNameV2 = "Vesting";

const decimals      = 10**18;

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    
    console.log("============================================================\n\r");
    console.log("Start time: ", Date(Date.now()));
    console.log("Upgrading contracts with the account:", deployer.address);  
    console.log("Account balance:", ((await deployer.getBalance())/decimals).toString());
    console.log("============================================================\n\r");

    const VestingFactoryV1     = await hre.ethers.getContractFactory(VestingBuildNameV1);
    const VestingArtifactV1    = await hre.artifacts.readArtifact(VestingBuildNameV1);
    console.log("vesting proxy address: ",VestingProxyAddr)
    const VestingContractV1    = VestingFactoryV1.attach(VestingProxyAddr);

    const currentSignature      = await VestingContractV1.signature();

    const VestingImplV1        = await hre.upgrades.erc1967.getImplementationAddress(VestingContractV1.address);

    console.log(`Upgrading \x1b[36m${VestingArtifactV1.contractName}\x1b[0m at proxy: \x1b[36m${VestingContractV1.address}\x1b[0m`);
    console.log(`Current implementation address: \x1b[36m${VestingImplV1}\x1b[0m`);
    console.log(`Current contract SIGNATURE: \x1b[36m${currentSignature}\x1b[0m\n\r`);

    const VestingFactoryV2     = await hre.ethers.getContractFactory(VestingBuildNameV2);
    const VestingArtifactV2    = await hre.artifacts.readArtifact(VestingBuildNameV2);
    const VestingContractV2    = await hre.upgrades.upgradeProxy(VestingContractV1, VestingFactoryV2);
    
    await VestingContractV2.deployed();
    const newSignature  = await VestingContractV2.signature();
    
    const VestingImplV2    = await hre.upgrades.erc1967.getImplementationAddress(VestingContractV2.address);

    console.log(`\x1b[36m${VestingArtifactV2.contractName}\x1b[0m deployed to: \x1b[36m${VestingContractV2.address}\x1b[0m`);
    console.log(`New implementation Address: \x1b[36m${VestingImplV2}\x1b[0m`);
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