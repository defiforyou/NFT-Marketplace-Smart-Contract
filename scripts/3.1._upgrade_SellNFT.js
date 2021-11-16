require('@nomiclabs/hardhat-ethers');

const { Proxies } = require('./.deployment_data_test.json');
const proxies = Proxies.Dev2;

const NFTSalesProxyAddr = proxies.NFT_SALES_ADDRESS;
const NFTSalesBuildNameV1 = "SellNFT";
const NFTSalesBuildNameV2 = "SellNFT";

const decimals      = 10**18;

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    
    console.log("============================================================\n\r");
    console.log("Upgrading contracts with the account:", deployer.address);  
    console.log("Account balance:", ((await deployer.getBalance())/decimals).toString());
    console.log("============================================================\n\r");

    const NFTSalesFactoryV1     = await hre.ethers.getContractFactory(NFTSalesBuildNameV1);
    const NFTSalesArtifactV1    = await hre.artifacts.readArtifact(NFTSalesBuildNameV1);
    const NFTSalesContractV1    = NFTSalesFactoryV1.attach(NFTSalesProxyAddr);

    const NFTSalesImplV1        = await hre.upgrades.erc1967.getImplementationAddress(NFTSalesContractV1.address);

    console.log(`Upgrading ${NFTSalesArtifactV1.contractName} at proxy: ${NFTSalesContractV1.address}`);
    console.log(`Current implementation address: ${NFTSalesImplV1}`);

    const NFTSalesFactoryV2     = await hre.ethers.getContractFactory(NFTSalesBuildNameV2);
    const NFTSalesArtifactV2    = await hre.artifacts.readArtifact(NFTSalesBuildNameV2);
    const NFTSalesContractV2    = await hre.upgrades.upgradeProxy(NFTSalesContractV1, NFTSalesFactoryV2);
    
    await NFTSalesContractV2.deployed();
    
    const NFTSalesImplV2    = await hre.upgrades.erc1967.getImplementationAddress(NFTSalesContractV2.address);

    console.log(`${NFTSalesArtifactV2.contractName} deployed to: ${NFTSalesContractV2.address}`);
    console.log(`New implementation Address: ${NFTSalesImplV2}`);

    console.log("============================================================\n\r");
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });