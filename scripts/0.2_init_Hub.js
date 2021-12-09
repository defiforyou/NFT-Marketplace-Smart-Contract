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

    console.log(`GranRole Hub `)
    await HubContract.grantRole("0x0000000000000000000000000000000000000000000000000000000000000000","0x7F093C1C75e1638c356543A7d5aCB6F516Cc1c9e");
    console.log("waitting...................");

     console.log("Set Pawn NFT Config")
    await HubContract.setWhitelistCollateral_NFT("0xB188f662768FE4c0799C3a8CDFCeA2630f332c58",1)
    console.log("Xong WhiteList!!!!!!! Config tiep theo")

    console.log("set PawnNFTConfig")
    await HubContract.setPawnNFTConfig(PawnNFTSettings.ZOOM,PawnNFTSettings.SystemFee,PawnNFTSettings.PenaltyRate,PawnNFTSettings.PrepaidFee,PawnNFTSettings.LateThreshold);

    // console.log(`Setting contract operator...`);
    // await HubContract.setOperator(operator);
    // console.log(`Contract operator: ${operator}\n\r`);

    // console.log(`Setting Late threshold...`);
    // await HubContract.setLateThreshold(lateThreshold);
    // console.log(`Late threshold: ${lateThreshold}\n\r`);

    // console.log(`Setting Penalty rate...`);
    // await HubContract.setPenaltyRate(penaltyRate);
    // console.log(`Penalty rate: ${penaltyRate}\n\r`);

    // console.log(`Setting Prepaid fee rate...`);
    // await HubContract.setPrepaidFeeRate(prepaidFeeRate);
    // console.log(`Prepaid fee rate: ${prepaidFeeRate}\n\r`);

    // console.log(`Setting System fee rate...`);
    // await HubContract.setSystemFeeRate(systemFeeRate);
    // console.log(`System fee rate: ${systemFeeRate}\n\r`);

    // console.log(`Setting Reputation contract...`);
    // await HubContract.setReputationContract(RepuProxyAddr);
    // console.log(`Reputation contract set at address: ${RepuProxyAddr}\n\r`);

    // console.log(`Setting Exchange contract...`);
    // await HubContract.setExchangeContract(ExchangeProxyAddr);
    // console.log(`Exchange contract set at address: ${ExchangeProxyAddr}\n\r`);

    // console.log(`Setting Pawn contract address...`);
    // await HubContract.setPawnContract(PawnProxyAddr);
    // console.log(`Pawn contract set at address: ${PawnProxyAddr}\n\r`);

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