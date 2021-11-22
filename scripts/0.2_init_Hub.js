require('@nomiclabs/hardhat-ethers');
const hre = require('hardhat');

const { Proxies, NFTSettings } = require('./.deployment_data_test.json');
const proxies = Proxies.Staging;

const HubProxyAddr     = proxies.HUB_ADDRESS;
const HubBuildName     = "contracts/hub/Hub.sol:Hub";

// TODO: Set pawn config
// const lateThreshold     = PawnConfig.LateThreshold;
// const penaltyRate       = PawnConfig.PenaltyRate;
// const prepaidFeeRate    = PawnConfig.PrepaidFee;
// const systemFeeRate     = PawnConfig.SystemFee;
// const operator          = PawnConfig.Operator;
// const feeWallet         = PawnConfig.FeeWallet;


const decimals          = 10**18;

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("============================================================");
    console.log(`Initialize contracts with the account: ${deployer.address}`);  
    console.log("Account balance:", ((await deployer.getBalance())/decimals).toString());
    console.log("============================================================");

    const HubFactory   = await hre.ethers.getContractFactory(HubBuildName);
    const HubArtifact  = await hre.artifacts.readArtifact(HubBuildName);
    const HubContract  = HubFactory.attach(HubProxyAddr);

    // const RepuFactory   = await hre.ethers.getContractFactory(RepuBuildName);
    // const RepuArtifact  = await hre.artifacts.readArtifact(RepuBuildName);
    // const RepuContract  = RepuFactory.attach(RepuProxyAddr);

    console.log(`Initializing ${HubArtifact.contractName}`);
    console.log(`Setting NFT Configuration...`);
    await HubContract.setNFTConfiguration(NFTSettings.CollectionCreatingFee, BigInt(NFTSettings.MintingFee));
    console.log(`Collection creating fee set at: ${NFTSettings.CollectionCreatingFee}`);
    console.log(`Minting fee set at: ${NFTSettings.MintingFee}\n\r`);

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

    console.log("============================================================\n\r");

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });