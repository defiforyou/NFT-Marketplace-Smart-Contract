require('@nomiclabs/hardhat-ethers');

const { Proxies } = require('./.deployment_data_test.json');
const proxiesEnv = Proxies.Beta;

const NFTAuctionProxyAddr = proxiesEnv.NFT_AUCTION_ADDRESS;
const NFTAuctionBuildNameV1 = "AuctionNFT";
const NFTAuctionBuildNameV2 = "AuctionNFT";

const decimals      = 10**18;

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    
    console.log("============================================================\n\r");
    console.log("Start time: ", Date(Date.now()));
    console.log("Upgrading contracts with the account:", deployer.address);  
    console.log("Account balance:", ((await deployer.getBalance())/decimals).toString());
    console.log("============================================================\n\r");

    const NFTAuctionFactoryV1     = await hre.ethers.getContractFactory(NFTAuctionBuildNameV1);
    const NFTAuctionArtifactV1    = await hre.artifacts.readArtifact(NFTAuctionBuildNameV1);
    const NFTAuctionContractV1    = NFTAuctionFactoryV1.attach(NFTAuctionProxyAddr);

    const currentSignature           = await NFTAuctionContractV1.signature();

    const NFTAuctionImplV1        = await hre.upgrades.erc1967.getImplementationAddress(NFTAuctionContractV1.address);

    console.log(`Upgrading \x1b[36m${NFTAuctionArtifactV1.contractName}\x1b[0m at proxy: \x1b[36m${NFTAuctionContractV1.address}\x1b[0m`);
    console.log(`Current implementation address: \x1b[36m${NFTAuctionImplV1}\x1b[0m`);
    console.log(`Current contract SIGNATURE: \x1b[36m${currentSignature}\x1b[0m\n\r`);

    const NFTAuctionFactoryV2     = await hre.ethers.getContractFactory(NFTAuctionBuildNameV2);
    const NFTAuctionArtifactV2    = await hre.artifacts.readArtifact(NFTAuctionBuildNameV2);
    const NFTAuctionContractV2    = await hre.upgrades.upgradeProxy(NFTAuctionContractV1, NFTAuctionFactoryV2);
    
    await NFTAuctionContractV2.deployed();
    const newSignature  = await NFTAuctionContractV2.signature();
    
    const NFTAuctionImplV2    = await hre.upgrades.erc1967.getImplementationAddress(NFTAuctionContractV2.address);

    console.log(`\x1b[36m${NFTAuctionArtifactV2.contractName}\x1b[0m deployed to: \x1b[36m${NFTAuctionContractV2.address}\x1b[0m`);
    console.log(`New implementation Address: \x1b[36m${NFTAuctionImplV2}\x1b[0m`);
    console.log(`New contract SIGNATURE: \x1b[36m${newSignature}\x1b[0m ${newSignature == currentSignature ? "(Signature unchanged)": ""}\n\r`);       

    console.log("============================================================\n\r");
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });