const hre = require('hardhat');
const { DefaultNFTCollectionSettings, Proxies } = require('./.deployment_data_live.json');
const proxiesEnv = Proxies.Live;

const NFTCollectionBuildName = "contracts/dfy-nft/DefiForYouNFTDefault.sol:DefiForYouNFT";

const decimals = 10 ** 18;

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    const NFTCollectionFactory = await hre.ethers.getContractFactory(NFTCollectionBuildName);
    const NFTCollectionArtifact = await hre.artifacts.readArtifact(NFTCollectionBuildName);

    console.log("============================================================\n\r");
    console.log(`Start time: ${Date(Date.now())}`);
    console.log(`Deploying \x1b[36m${NFTCollectionArtifact.contractName}\x1b[0m contracts with the account: ${deployer.address}`);
    console.log(`Account balance: ${((await deployer.getBalance()) / decimals).toString()}`);
    console.log("============================================================\n\r");
    
    console.log(`HUB_ADDRESS: \x1b[31m${proxiesEnv.HUB_ADDRESS}\x1b[0m`);

    const NFTCollectionContract = await NFTCollectionFactory.deploy(
        DefaultNFTCollectionSettings.Name,           // Token name
        DefaultNFTCollectionSettings.Symbol,         // Token symbol
        DefaultNFTCollectionSettings.Owner,          // Collection owner
        DefaultNFTCollectionSettings.Royalty,        // Royalty rate
        DefaultNFTCollectionSettings.CollectionCID,   // Collection CID
        proxiesEnv.HUB_ADDRESS
    );
    
         
    await NFTCollectionContract.deployed();

    console.log(`NFT_DEFAULT_COLLECTION_ADDRESS: \x1b[36m${NFTCollectionContract.address}\x1b[0m\n\r`);
    
    console.log(`Completed at ${Date(Date.now())}`);
    console.log("============================================================\n\r");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });