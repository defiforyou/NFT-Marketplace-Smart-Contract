require('@nomiclabs/hardhat-ethers');

const { Proxies } = require('./.deployment_data_prelive.json');
const proxiesEnv = Proxies.Prelive;

const NFTSalesProxyAddr = proxiesEnv.NFT_SALES_ADDRESS;
const NFTSalesBuildName = "SellNFT";

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

    const NFTSalesFactory     = await hre.ethers.getContractFactory(NFTSalesBuildName);
    const NFTSalesArtifact    = await hre.artifacts.readArtifact(NFTSalesBuildName);
    const NFTSalesContract    = NFTSalesFactory.attach(NFTSalesProxyAddr);
    
    const signature         = await NFTSalesContract.signature();
    const NFTSalesImpl = await hre.upgrades.erc1967.getImplementationAddress(NFTSalesContract.address);

    console.log(`\x1b[36m${NFTSalesArtifact.contractName}\x1b[0m is deployed at: \x1b[36m${NFTSalesContract.address}\x1b[0m`);
    console.log(`Implementation address: \x1b[36m${NFTSalesImpl}\x1b[0m`);
    console.log(`Contract SIGNATURE: \x1b[36m${signature}\x1b[0m\n\r`);

    const HubFactory   = await hre.ethers.getContractFactory(HubBuildName);
    const HubArtifact  = await hre.artifacts.readArtifact(HubBuildName);
    const HubContract  = HubFactory.attach(HubProxy);

    console.log(`HUB_ADDRESS: \x1b[31m${HubContract.address}\x1b[0m`);
    console.log(`Registering \x1b[36m${NFTSalesArtifact.contractName}\x1b[0m to ${HubArtifact.contractName}...`);
    
    await HubContract.registerContract(signature, NFTSalesContract.address, NFTSalesArtifact.contractName);
    
    console.log(`Completed at ${Date(Date.now())}`);

    console.log("============================================================\n\r");
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });