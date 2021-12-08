require('@nomiclabs/hardhat-ethers');

const hre = require('hardhat');
const { Proxies } = require('./.deployment_data_test.json');
const decimals = 10 ** 18;

const NFTAuctionBuildName = "AuctionNFT";
const HubBuildName = "Hub";
const HubProxy = Proxies.Staging.HUB_ADDRESS;

const proxyType = { kind: "uups" };

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("============================================================\n\r");
    console.log("Start time: ", Date(Date.now()));
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
    console.log("============================================================\n\r");
    
    const NFTAuctionFactory = await hre.ethers.getContractFactory(NFTAuctionBuildName);
    const NFTAuctionArtifact = await hre.artifacts.readArtifact(NFTAuctionBuildName);
    const NFTAuctionContract = await hre.upgrades.deployProxy(NFTAuctionFactory, [HubProxy], proxyType);

    await NFTAuctionContract.deployed();
    const signature  = await NFTAuctionContract.signature();

    console.log(`NFT_AUCTION_ADDRESS: \x1b[36m${NFTAuctionContract.address}\x1b[0m`);
    console.log(`Signature: \x1b[36m${signature}\x1b[0m`);

    const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(NFTAuctionContract.address);
    console.log(`\x1b[36m${NFTAuctionArtifact.contractName}\x1b[0m implementation address: \x1b[36m${implementationAddress}\x1b[0m\n\r`);

    const HubFactory   = await hre.ethers.getContractFactory(HubBuildName);
    const HubArtifact  = await hre.artifacts.readArtifact(HubBuildName);
    const HubContract  = HubFactory.attach(HubProxy);

    console.log(`HUB_ADDRESS: \x1b[31m${HubContract.address}\x1b[0m`);
    console.log(`Registering \x1b[36m${NFTAuctionArtifact.contractName}\x1b[0m to \x1b[31m${HubArtifact.contractName}\x1b[0m...`);
    
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