require('@nomiclabs/hardhat-ethers');

const hre = require('hardhat');
const { Proxies } = require('./.deployment_data_live.json');
const proxiesEnv = Proxies.Live;

const decimals = 10 ** 18;

const VestingBuildName = "Vesting";
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
    const VestingFactory = await hre.ethers.getContractFactory(VestingBuildName);
    const VestingArtifact = await hre.artifacts.readArtifact(VestingBuildName);
    const VestingContract = await hre.upgrades.deployProxy(VestingFactory, [deployer.address,HubProxy], proxyType);

    await VestingContract.deployed();
    const signature  = await VestingContract.signature();

    console.log(`Vesting_ADDRESS: \x1b[36m${VestingContract.address}\x1b[0m`);
    console.log(`Signature: \x1b[36m${signature}\x1b[0m`);

    const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(VestingContract.address);
    console.log(`\x1b[36m${VestingArtifact.contractName}\x1b[0m implementation address: \x1b[36m${implementationAddress}\x1b[0m\n\r`);

    const HubFactory   = await hre.ethers.getContractFactory(HubBuildName);
    const HubArtifact  = await hre.artifacts.readArtifact(HubBuildName);
    const HubContract  = HubFactory.attach(HubProxy);

    console.log(`HUB_ADDRESS: \x1b[31m${HubContract.address}\x1b[0m`);
    console.log(`Registering \x1b[36m${VestingArtifact.contractName}\x1b[0m to \x1b[31m${HubArtifact.contractName}\x1b[0m...`);
    
    let tnx = await HubContract.registerContract(signature, VestingContract.address, VestingArtifact.contractName);
    await tnx.wait();

    console.log(`Completed at ${Date(Date.now())}`);

    console.log("============================================================\n\r");
}
main()
    .then(() => {})
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });