require('@nomiclabs/hardhat-ethers');

const { Proxies } = require('./.deployment_data_test.json');

const NFTAuctionProxyAddr = Proxies.Staging.NFT_AUCTION_ADDRESS;
const NFTAuctionBuildNameV1 = "AuctionNFT";
const NFTAuctionBuildNameV2 = "AuctionNFT";

const decimals      = 10**18;

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    
    console.log("============================================================\n\r");
    console.log("Upgrading contracts with the account:", deployer.address);  
    console.log("Account balance:", ((await deployer.getBalance())/decimals).toString());
    console.log("============================================================\n\r");

    const NFTAuctionFactoryV1     = await hre.ethers.getContractFactory(NFTAuctionBuildNameV1);
    const NFTAuctionArtifactV1    = await hre.artifacts.readArtifact(NFTAuctionBuildNameV1);
    const NFTAuctionContractV1    = NFTAuctionFactoryV1.attach(NFTAuctionProxyAddr);

    const NFTAuctionImplV1        = await hre.upgrades.erc1967.getImplementationAddress(NFTAuctionContractV1.address);

    console.log(`Upgrading ${NFTAuctionArtifactV1.contractName} at proxy: ${NFTAuctionContractV1.address}`);
    console.log(`Current implementation address: ${NFTAuctionImplV1}`);

    const NFTAuctionFactoryV2     = await hre.ethers.getContractFactory(NFTAuctionBuildNameV2);
    const NFTAuctionArtifactV2    = await hre.artifacts.readArtifact(NFTAuctionBuildNameV2);
    const NFTAuctionContractV2    = await hre.upgrades.upgradeProxy(NFTAuctionContractV1, NFTAuctionFactoryV2);
    
    await NFTAuctionContractV2.deployed();
    
    const NFTAuctionImplV2    = await hre.upgrades.erc1967.getImplementationAddress(NFTAuctionContractV2.address);

    console.log(`${NFTAuctionArtifactV2.contractName} deployed to: ${NFTAuctionContractV2.address}`);
    console.log(`New implementation Address: ${NFTAuctionImplV2}`);

    console.log("============================================================\n\r");
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });