const ERC20Artifact = "DToken"
const vestingArtifact = "Vesting"
const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const BigNumber = require("bignumber.js")
const artifactHub = "Hub";
require("hardhat-gas-reporter");
let vestingContract
let Erc20Contract
let owner, user1, user2, user3, user4, user5, user6, user7, user8, user9
let vestingInfor = {
    maxSupplyClaim: BigInt(1000*10**18),
    lastClaim: "1"
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function countTime(num) {
    return num * 30 * 60 * 60
}

function convertTime(ms) {
    return parseInt((Date.now() + ms)/1000)
}

let scheme = {
    schemeId: 0,
    name: "",
    vestTime: 0,
    cliffTime: 0,
    durationTime: 0,
    periodTime: 0,
    tokenAddress: ""
}

let vest = {
    wallet: "",
    totalAmount: 0,
    amountDeposit: 0,
    totalClaimed: 0,
    schemeId: 0,
    startTime: Date.now()
}

vestingIds = []

describe("vesting", function() {
    before("Vesting -deploy contract",async function() {
        [owner, user1, user2, user3, user4, user5, user6, user7, user8, user9] = await ethers.getSigners()
        const hubContractFactory = await hre.ethers.getContractFactory(artifactHub);
        const hubContract = await hre.upgrades.deployProxy(
            hubContractFactory,
            [_feeWalletHub.address, _feeToken.address, _deployer.address],
            { kind: "uups" }

        );
        _hubContract = await hubContract.deployed();
        console.log("account 0: ", owner.address)
        const Vesting = await ethers.getContractFactory(vestingArtifact)
        const DToken = await ethers.getContractFactory(ERC20Artifact)
        const paramDeployERC20 = {
            totalSupply: "10000000000",
        }
        
        const dToken = await DToken.deploy(paramDeployERC20.totalSupply)
        Erc20Contract = await dToken.deployed()
        Erc20Contract.transfer(owner.address, BigInt(10000000000*10**18))

        const vesting = await upgrades.deployProxy(Vesting, [owner.address], {kind: "uups"})
        vestingContract = await vesting.deployed()
        Erc20Contract.approve(vestingContract.address, vestingInfor.maxSupplyClaim)
    })
    it("Should create scheme", async function() {
        // string memory name,
        // uint256 vestTime,
        // uint256 cliffTime,
        // uint256 durationTime,
        // uint256 periodTime,
        // address tokenAddress
        let isSuccess = false;
        scheme = {
            name: "lương nhân đức",
            vestTime: 2,
            cliffTime: 1,
            durationTime: 10,
            periodTime: 5,
            tokenAddress: Erc20Contract.address
        }
        try {
            const transaction = await vestingContract.newSchemeInformation(
                                                        scheme.name, 
                                                        scheme.vestTime, 
                                                        scheme.cliffTime, 
                                                        scheme.durationTime,
                                                        scheme.periodTime,
                                                        scheme.tokenAddress
                                                    )
            const txData = await transaction.wait()
            const event = txData.events[0].args
            scheme.schemeId = event.schemeBcId
            isSuccess =  true
        }catch (e) {
            console.log(e)
            isSuccess = false
        }
        expect(isSuccess).to.true
    })
    it("should create new Vesting information", async () => {
        vest = {
            wallet: user1.address,
            totalAmount: BigInt(1005* 10**18),
            amountDeposit: BigInt(900* 10**18),
            totalClaimed: BigInt(100* 10**18),
            schemeId: scheme.schemeId,
            startTime: parseInt(Date.now()/1000)
        }
        const transaction = await vestingContract
                                    .newVestingInformation(
                                        vest.wallet, 
                                        vest.totalAmount, 
                                        vest.amountDeposit, 
                                        vest.totalClaimed,
                                        vest.schemeId, 
                                        vest.startTime
                                    )
        const txData = await transaction.wait()
        
        const event = txData.events[3].args
        vest.vestingId = event.vestingBcId

        vestingIds.push(event.vestingBcId)
    })
    it("should claim token", async () => {
        //address _wallet, uint256 _vestingId, uint256 _schemeDetailId, uint256 _schemeId, bool isClaimAll
        
        await sleep(15000)
        const transaction = await vestingContract
                                .claim(
                                    vestingIds, 
                                    scheme.tokenAddress)
        const txData = await transaction.wait()
        for(let i = 0; i < txData.events.length; i++){
            const event = txData.events[i]
        }
    })
    
})