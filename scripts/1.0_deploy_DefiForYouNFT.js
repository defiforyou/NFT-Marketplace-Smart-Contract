const hre = require('hardhat');
const NFTCollectionBuildName = "DefiForYouNFT";

const collectionOwner = "0x55F163E6fbF8165E9efc5941d0F76b8D0F6C1A95";

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
        "DefiForYou_Soft_NFT",
        "DFYNFT",
        collectionOwner,
        1000,
        "QmPYA8eJCgh4WJohWqSa3XtUwBBnRbpa22S1wt1H1JrUr6"
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