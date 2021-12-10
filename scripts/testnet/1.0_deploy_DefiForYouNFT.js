const hre = require('hardhat');
const { DefaultNFTCollectionSettings } = require('./.deployment_data_test.json');
const NFTCollectionBuildName = "DefiForYouNFT";

const decimals = 10 ** 18;

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("============================================================\n\r");
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
    console.log("============================================================\n\r");

    const NFTCollectionFactory = await hre.ethers.getContractFactory(NFTCollectionBuildName);
    const NFTCollectionArtifact = await hre.artifacts.readArtifact(NFTCollectionBuildName);

    const NFTCollectionContract = await NFTCollectionFactory.deploy(
        DefaultNFTCollectionSettings.Name,           // Token name
        DefaultNFTCollectionSettings.Symbol,         // Token symbol
        DefaultNFTCollectionSettings.Owner,          // Collection owner
        DefaultNFTCollectionSettings.Royalty,        // Royalty rate
        DefaultNFTCollectionSettings.CollectionCID   // Collection CID
    );

    await NFTCollectionContract.deployed();

    console.log(`${NFTCollectionArtifact.contractName} implementation address: ${NFTCollectionContract.address}`);

    console.log("============================================================\n\r");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });