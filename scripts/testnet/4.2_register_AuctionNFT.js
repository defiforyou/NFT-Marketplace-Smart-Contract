require('@nomiclabs/hardhat-ethers');

const { Proxies } = require('./.deployment_data_test.json');
const proxiesEnv = Proxies.BCTest;

const NFTAuctionProxyAddr = proxiesEnv.NFT_AUCTION_ADDRESS;
const NFTAuctionBuildName = "AuctionNFT";

const HubProxy = proxiesEnv.HUB_ADDRESS;
const HubBuildName = "Hub";

const decimals      = 10**18;

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    
    console.log("============================================================\n\r");
    console.log("Start time: ", Date(Date.now()));
    console.log("Registering contract with the account:", deployer.address);  
    console.log("Account balance:", ((await deployer.getBalance())/decimals).toString());
    console.log("============================================================\n\r");

    const NFTAuctionFactory     = await hre.ethers.getContractFactory(NFTAuctionBuildName);
    const NFTAuctionArtifact    = await hre.artifacts.readArtifact(NFTAuctionBuildName);
    const NFTAuctionContract    = NFTAuctionFactory.attach(NFTAuctionProxyAddr);
    
    const signature         = await NFTAuctionContract.signature();
    const NFTAuctionImpl    = await hre.upgrades.erc1967.getImplementationAddress(NFTAuctionContract.address);

    console.log(`\x1b[36m${NFTAuctionArtifact.contractName}\x1b[0m is deployed at: \x1b[36m${NFTAuctionContract.address}\x1b[0m`);
    console.log(`Implementation address: \x1b[36m${NFTAuctionImpl}\x1b[0m`);
    console.log(`Contract SIGNATURE: \x1b[36m${signature}\x1b[0m\n\r`);

    const HubFactory   = await hre.ethers.getContractFactory(HubBuildName);
    const HubArtifact  = await hre.artifacts.readArtifact(HubBuildName);
    const HubContract  = HubFactory.attach(HubProxy);

    console.log(`HUB_ADDRESS: \x1b[31m${HubContract.address}\x1b[0m`);
    console.log(`Registering \x1b[36m${NFTAuctionArtifact.contractName}\x1b[0m to ${HubArtifact.contractName}...`);
    
    await HubContract.registerContract(signature, NFTAuctionContract.address, NFTAuctionArtifact.contractName);
    
    console.log(`Completed at ${Date(Date.now())}`);

    console.log("============================================================\n\r");
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });