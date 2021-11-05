const hre = require('hardhat');
const NFTCollectionBuildName = "DefiForYouNFT";

const collectionOwner = "0x832dbe8bCB706F6ab0aC1C3d4C13c739FA7B8f6F";

const decimals  = 10**18;

async function main() {
    const [deployer] = await hre.ethers.getSigners();
  
    console.log("============================================================\n\r");
    console.log("Deploying contracts with the account:", deployer.address);  
    console.log("Account balance:", ((await deployer.getBalance())/decimals).toString());
    console.log("============================================================\n\r");
  
    const NFTCollectionFactory   = await hre.ethers.getContractFactory(NFTCollectionBuildName);
    const NFTCollectionArtifact  = await hre.artifacts.readArtifact(NFTCollectionBuildName);

    const NFTCollectionContract  = await NFTCollectionFactory.deploy(
        "DefiForYou_Soft_NFT",
        "DFYNFT",
        collectionOwner,
        0,
        ""
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