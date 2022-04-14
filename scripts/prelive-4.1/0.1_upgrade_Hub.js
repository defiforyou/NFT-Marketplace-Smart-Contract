require('@nomiclabs/hardhat-ethers');
const hre = require('hardhat');
const fs = require("fs");

const envKey = "Prelive";
const datafilePath = "./scripts/prelive-4.1/"

const datafileName = ".deployment_data.json";
const deploymentInfo = require('./' + datafileName);
const dataFileRelativePath = datafilePath + datafileName;

const decimals      = 10**18;

const proxiesEnv = deploymentInfo.Proxies[envKey];

const ContractBuildName = "Hub";
const ContractJsonKey = "HUB_ADDRESS";

const ContractProxy = proxiesEnv[ContractJsonKey];

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("===================================\n\r");
    console.log("Start time: ", Date(Date.now()));
    console.log("Upgrading contracts with the account: ", deployer.address);
    console.log("Account balance: ", ((await deployer.getBalance()) / decimals).toString());
    console.log("===================================\n\r");

    const ContractFactoryV1     = await hre.ethers.getContractFactory(ContractBuildName);
    const ContractArtifactV1    = await hre.artifacts.readArtifact(ContractBuildName);
    const DeployedContractV1    = ContractFactoryV1.attach(ContractProxy);

    const ContractImplV1        = await hre.upgrades.erc1967.getImplementationAddress(DeployedContractV1.address);

    console.log(`Upgrading \x1b[31m${ContractArtifactV1.contractName}\x1b[0m at proxy: \x1b[31m${DeployedContractV1.address}\x1b[0m`);
    console.log(`Current implementation address: \x1b[31m${ContractImplV1}\x1b[0m`);

    const ContractFactoryV2     = await hre.ethers.getContractFactory(ContractBuildName);
    const ContractArtifactV2    = await hre.artifacts.readArtifact(ContractBuildName);
    const DeployedContractV2    = await hre.upgrades.upgradeProxy(DeployedContractV1, ContractFactoryV2);
    
    await DeployedContractV2.deployed();
    
    const ContractImplV2    = await hre.upgrades.erc1967.getImplementationAddress(DeployedContractV2.address);

    console.log(`\x1b[31m${ContractArtifactV2.contractName}\x1b[0m deployed to: \x1b[31m${DeployedContractV2.address}\x1b[0m`);
    console.log(`New implementation Address: \x1b[31m${ContractImplV2}\x1b[0m\n\r`);

    // Write the result to deployment data file

    deploymentInfo.Implementations[envKey][ContractJsonKey] = ContractImplV2;

    fs.writeFile(dataFileRelativePath, JSON.stringify(deploymentInfo, null, "\t"), err => {
    if (err)
        console.log("Error when trying to write to deployment data file.", err);
    else
        console.log("Information has been written to deployment data file.");
    });

    console.log(`Completed at ${Date(Date.now())}`);
    console.log("===========================\n\r");

}

main()
    .then(() => {})
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });