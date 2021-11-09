require('@nomiclabs/hardhat-ethers');

const hre = require('hardhat');

const CollectionMgrBuildName = "DefiForYouNFTFactory";

const proxyType = { kind: "uups" };


async function main() {
    const [deployer, proxyAdmin] = await hre.ethers.getSigners();

    console.log("============================================================\n\r");
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
    console.log("============================================================\n\r");
    const CollectionMgrFactory = await hre.ethers.getContractFactory(CollectionMgrBuildName);
    const CollectionMgrArtifact = await hre.artifacts.readArtifact(CollectionMgrBuildName);
    const CollectionMgrContract = await hre.upgrades.deployProxy(CollectionMgrFactory, proxyType);

    await CollectionMgrContract.deployed();

    console.log(`NFT_FACTORY_ADDRESS: ${CollectionMgrContract.address}`);

    implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(CollectionMgrContract.address);
    console.log(`${CollectionMgrArtifact.contractName} implementation address: ${implementationAddress}`);

    console.log("============================================================\n\r");
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });