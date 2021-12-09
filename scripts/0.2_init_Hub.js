require('@nomiclabs/hardhat-ethers');
const hre = require('hardhat');

const { Proxies, NFTSettings, MarketSettings, PawnNFTSettings,  } = require('./.deployment_data_test.json');
const proxiesEnv = Proxies.Beta;

const HubProxyAddr     = proxiesEnv.HUB_ADDRESS;
const HubBuildName     = "contracts/hub/Hub.sol:Hub";

const decimals          = 10**18;

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("============================================================");
    console.log("Start time: ", Date(Date.now()));
    console.log(`Initialize contracts with the account: ${deployer.address}`);  
    console.log("Account balance:", ((await deployer.getBalance())/decimals).toString());
    console.log("============================================================");

    const HubFactory   = await hre.ethers.getContractFactory(HubBuildName);
    const HubArtifact  = await hre.artifacts.readArtifact(HubBuildName);
    const HubContract  = HubFactory.attach(HubProxyAddr);

    console.log(`Initializing \x1b[31m${HubArtifact.contractName}\x1b[0m`);
    console.log(`Setting NFT Configuration...`);
    await HubContract.setNFTConfiguration(NFTSettings.CollectionCreatingFee, BigInt(NFTSettings.MintingFee));
    console.log(`Collection creating fee set at: \x1b[31m${NFTSettings.CollectionCreatingFee}\x1b[0m`);
    console.log(`Minting fee set at: \x1b[31m${NFTSettings.MintingFee}\x1b[0m\n\r`);

    console.log(`Setting NFT Market Configuration...`);
    await HubContract.setNFTMarketConfig(MarketSettings.ZOOM, MarketSettings.MarketFeeRate, MarketSettings.MarketFeeWallet);
    console.log(`Market fee rate set at: \x1b[31m${MarketSettings.MarketFeeRate}\x1b[0m`);
    console.log(`Market fee wallet set at: \x1b[31m${MarketSettings.MarketFeeWallet}\x1b[0m\n\r`);

    console.log(`Setting NFT Market Configuration...`);
    await HubContract.setPawnNFTConfig(PawnNFTSettings.ZOOM, PawnNFTSettings.SystemFee, PawnNFTSettings.PenaltyRate, PawnNFTSettings.PrepaidFee, PawnNFTSettings.LateThreshold);
    console.log(`ZOOM: \x1b[31m${PawnNFTSettings.ZOOM}\x1b[0m`);
    console.log(`System fee rate: \x1b[31m${PawnNFTSettings.SystemFee}\x1b[0m`);
    console.log(`Penalty rate: \x1b[31m${PawnNFTSettings.PenaltyRate}\x1b[0m`);
    console.log(`Prepaid fee rate: \x1b[31m${PawnNFTSettings.PrepaidFee}\x1b[0m`);
    console.log(`Late threshold: \x1b[31m${PawnNFTSettings.LateThreshold}\x1b[0m\n\r`);

    // console.log(`Setting Whitelisted collateral...`);
    // for await (let token of Tokens) {
    //     if(token.Address != "0x0000000000000000000000000000000000000000") {
    //         await HubContract.setWhitelistCollateral(token.Address, 1);
    //         console.log(`\tWhitelisted token as collateral: ${token.Symbol}: ${token.Address}`);
    //     }
    // }

    // console.log("============================================================\n\r");
    // console.log(`Initializing ${RepuArtifact.contractName}...`);
    // console.log(`Setting contract caller...`);
    // await RepuContract.addWhitelistedContractCaller(LoanProxyAddr);
    // console.log(`Contract caller set at address: ${LoanArtifact.contractName} - ${LoanProxyAddr}\n\r`);
    
    console.log(`Completed at ${Date(Date.now())}`);

    console.log("============================================================\n\r");

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });