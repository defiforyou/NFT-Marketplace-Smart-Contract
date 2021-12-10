require('@nomiclabs/hardhat-ethers');
const hre = require('hardhat');

const { Proxies, HubSettings, NFTSettings, MarketSettings, PawnNFTSettings } = require('./.deployment_data_test.json');
const proxiesEnv = Proxies.BCTest;

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

    console.log(`Initializing \x1b[31m${HubArtifact.contractName}\x1b[0m at \x1b[31m${HubContract.address}\x1b[0m\n\r`);
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

    console.log(`Setting Operator accounts...`);
    for await (let account of HubSettings.Operators) {
        await HubContract.grantRole(HubSettings.OPERATOR_ROLE, account);
        console.log(`\tGranted Operator role to: \x1b[31m${account}\x1b[0m`);
    }

    // console.log(`GranRole Hub `)
    // await HubContract.grantRole(HubSettings.ADMIN_ROLE,"0x7F093C1C75e1638c356543A7d5aCB6F516Cc1c9e");
    // console.log("waitting...................");

    // console.log("Set Pawn NFT Config")
    // await HubContract.setWhitelistCollateral_NFT("0xB188f662768FE4c0799C3a8CDFCeA2630f332c58",1)
    // console.log("Xong WhiteList!!!!!!! Config tiep theo");

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