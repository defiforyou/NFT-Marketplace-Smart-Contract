require('@nomiclabs/hardhat-ethers');

const { Proxies } = require('./.deployment_data_prelive.json');
const proxiesEnv = Proxies.Prelive;

const NFTSalesProxyAddr = proxiesEnv.NFT_SALES_ADDRESS;
const NFTSalesBuildNameV1 = "SellNFT";
const NFTSalesBuildNameV2 = "SellNFT";

const decimals      = 10**18;

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    
    console.log("============================================================\n\r");
    console.log("Start time: ", Date(Date.now()));
    console.log("Upgrading contracts with the account:", deployer.address);  
    console.log("Account balance:", ((await deployer.getBalance())/decimals).toString());
    console.log("============================================================\n\r");

    const NFTSalesFactoryV1     = await hre.ethers.getContractFactory(NFTSalesBuildNameV1);
    const NFTSalesArtifactV1    = await hre.artifacts.readArtifact(NFTSalesBuildNameV1);
    const NFTSalesContractV1    = NFTSalesFactoryV1.attach(NFTSalesProxyAddr);
    
    const currentSignature      = await NFTSalesContractV1.signature();

    const NFTSalesImplV1        = await hre.upgrades.erc1967.getImplementationAddress(NFTSalesContractV1.address);

    console.log(`Upgrading \x1b[36m${NFTSalesArtifactV1.contractName}\x1b[0m at proxy: \x1b[36m${NFTSalesContractV1.address}\x1b[0m`);
    console.log(`Current implementation address: \x1b[36m${NFTSalesImplV1}\x1b[0m`);
    console.log(`Current contract SIGNATURE: \x1b[36m${currentSignature}\x1b[0m\n\r`);

    const NFTSalesFactoryV2     = await hre.ethers.getContractFactory(NFTSalesBuildNameV2);
    const NFTSalesArtifactV2    = await hre.artifacts.readArtifact(NFTSalesBuildNameV2);
    const NFTSalesContractV2    = await hre.upgrades.upgradeProxy(NFTSalesContractV1, NFTSalesFactoryV2);
    
    await NFTSalesContractV2.deployed();
    const newSignature  = await NFTSalesContractV2.signature();
    
    const NFTSalesImplV2    = await hre.upgrades.erc1967.getImplementationAddress(NFTSalesContractV2.address);

    console.log(`\x1b[36m${NFTSalesArtifactV2.contractName}\x1b[0m deployed to: \x1b[36m${NFTSalesContractV2.address}\x1b[0m`);
    console.log(`New implementation Address: \x1b[36m${NFTSalesImplV2}\x1b[0m`);
    console.log(`New contract SIGNATURE: \x1b[36m${newSignature}\x1b[0m ${newSignature == currentSignature ? "(Signature unchanged)": ""}\n\r`);
    
    console.log(`Completed at ${Date(Date.now())}`);

    console.log("============================================================\n\r");
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });