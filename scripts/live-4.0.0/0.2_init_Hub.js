require('@nomiclabs/hardhat-ethers');
const hre = require('hardhat');

const { Proxies, NFTSettings, MarketSettings, PawnNFTSettings, EvaluationSettings } = require('./.deployment_data_live.json');
const proxiesEnv = Proxies.Live;

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

    let txn, receipt;

    console.log(`Initializing \x1b[31m${HubArtifact.contractName}\x1b[0m at \x1b[31m${HubContract.address}\x1b[0m\n\r`);
    // console.log(`Setting NFT Configuration...`);
    // txn = await HubContract.setNFTConfiguration(NFTSettings.CollectionCreatingFee, BigInt(NFTSettings.MintingFee));
    // receipt = await txn.wait();
    // console.log(`Collection creating fee set at: \x1b[31m${NFTSettings.CollectionCreatingFee}\x1b[0m`);
    // console.log(`Minting fee set at: \x1b[31m${NFTSettings.MintingFee}\x1b[0m\n\r`);

    // console.log(`Setting NFT Market Configuration...`);
    // txn = await HubContract.setNFTMarketConfig(MarketSettings.ZOOM, MarketSettings.MarketFeeRate, MarketSettings.MarketFeeWallet);
    // receipt = await txn.wait();
    // console.log(`Market fee rate set at: \x1b[31m${MarketSettings.MarketFeeRate}\x1b[0m`);
    // console.log(`Market fee wallet set at: \x1b[31m${MarketSettings.MarketFeeWallet}\x1b[0m\n\r`);

    console.log(`Setting NFT Pawn Configuration...`);
    txn = await HubContract.setPawnNFTConfig(PawnNFTSettings.ZOOM, PawnNFTSettings.SystemFee, PawnNFTSettings.PenaltyRate, PawnNFTSettings.PrepaidFee, PawnNFTSettings.LateThreshold);
    receipt = await txn.wait();

    console.log(`ZOOM: \x1b[31m${PawnNFTSettings.ZOOM}\x1b[0m`);
    console.log(`System fee rate: \x1b[31m${PawnNFTSettings.SystemFee}\x1b[0m`);
    console.log(`Penalty rate: \x1b[31m${PawnNFTSettings.PenaltyRate}\x1b[0m`);
    console.log(`Prepaid fee rate: \x1b[31m${PawnNFTSettings.PrepaidFee}\x1b[0m`);
    console.log(`Late threshold: \x1b[31m${PawnNFTSettings.LateThreshold}\x1b[0m\n\r`);

    if(EvaluationSettings.length > 0) {
        console.log(`Setting Evaluation Configuration...`);
        for await(let evaluationConfig of EvaluationSettings) {
            txn = await HubContract.setEvaluationConfig(evaluationConfig.Token, BigInt(evaluationConfig.EvaluationFee), BigInt(evaluationConfig.MintingFee));
            receipt = await txn.wait();
            
            console.log(`Token \x1b[31m${evaluationConfig.Symbol}\x1b[0m at: \x1b[31m${evaluationConfig.Token}\x1b[0m`);
            console.log(`Evaluation fee: \x1b[31m${evaluationConfig.EvaluationFee}\x1b[0m`);
            console.log(`Hard NFT Minting fee: \x1b[31m${evaluationConfig.MintingFee}\x1b[0m`);
            console.log("============================================================\n\r");
        }
    }

    console.log(`\n\r`);
    console.log(`Completed at ${Date(Date.now())}`);

    console.log("============================================================\n\r");

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });