const artifactVesting = "Vesting"
const ERC20Artifact = "DToken"
const artifactHub = "Hub"
const { ethers, upgrades } = require("hardhat")
const { expect } = require("chai")
const chai = require("chai")
chai.use(require("chai-string"))
require("hardhat-gas-reporter")
const operatorRole = "0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929"
const registerRole = "0x12090aa55130d5a2442eb84fc286ca6e600db6c50b6c5d9b6d0d929f0e2d8ce8"
const pauseRole = "0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a"
describe('Vesting', () => {
    let _hubContract
    let _vestingContract
    let _DFYTokenContract
    let signature
    let dToken
    let _deployer, _feeWallet, _feeWalletHub, _feeToken, _user1, _owner
    let decimals = 10**18
    let address0x0 = "0x0000000000000000000000000000000000000000"
    let scheme = {
    }
    let vestingIds = []
    let vest = {
    }
    
    before("deploy contract ",async () => {
        [
            _deployer,
            _feeWallet,
            _feeWalletHub,
            _feeToken,
            _user1,
            _owner
    
        ] = await ethers.getSigners();
        // deploy token 
        const DToken = await ethers.getContractFactory(ERC20Artifact)
        dToken = await DToken.deploy(BigInt(1000000000000000000000))
        _DFYTokenContract = await dToken.deployed()
        // deploy hub
        const hubContractFactory = await hre.ethers.getContractFactory(artifactHub);
        const hubContract = await hre.upgrades.deployProxy(
            hubContractFactory,
            [_feeWalletHub.address, _feeToken.address, _deployer.address],
            { kind: "uups" }

        );
        _hubContract = await hubContract.deployed()
        console.log(_hubContract.address, "address hub contract : ");
        // grantRole operator and register to deployer
        await _hubContract.connect(_deployer).setSystemConfig(_feeWallet.address, _DFYTokenContract.address)
        await _hubContract.connect(_deployer).grantRole(operatorRole,_deployer.address)
        await _hubContract.connect(_deployer).grantRole(registerRole,_deployer.address)

        // deploy vesting
        const VestingFactory = await hre.ethers.getContractFactory(artifactVesting);
        const vestingContract = await hre.upgrades.deployProxy(
            VestingFactory,
            [_deployer.address, _hubContract.address],
            {kind:"uups"}
        )
        _vestingContract = await vestingContract.deployed()

        //get signature and register contract
        signature = await _vestingContract.connect(_deployer).signature()
        await _hubContract.connect(_deployer).registerContract(signature, _vestingContract.address, VestingFactory)
        
    })
    describe("unit test",() => {
        it("create scheme with vest-claim = 0,it should return vest-claim-invalid ", async () => {
            scheme = {
                name: "scheme1",
                vestTime: 0,
                cliffTime: 0,
                durationTime: 21000,
                periodTime: 420,
                tokenAddress: _DFYTokenContract.address
            }
            await expect(
                _vestingContract.newSchemeInformation(
                    scheme.name, 
                    scheme.vestTime, 
                    scheme.cliffTime, 
                    scheme.durationTime,
                    scheme.periodTime,
                    scheme.tokenAddress
                )
            ).to.be.revertedWith("vest-claim-invalid")
            
        })
        it("create scheme with name null, it should return name-invalid", async () => {
            scheme = {
                name: "",
                vestTime: 50,
                cliffTime: 0,
                durationTime: 21000,
                periodTime: 420,
                tokenAddress: _DFYTokenContract.address
            }
            await expect(
                _vestingContract.newSchemeInformation(
                    scheme.name, 
                    scheme.vestTime, 
                    scheme.cliffTime, 
                    scheme.durationTime,
                    scheme.periodTime,
                    scheme.tokenAddress
                )
            ).to.be.revertedWith("name-invalid")
        })
        it("create scheme with durationTime = 0, it should return duration-time-invalid", async () => {
            scheme = {
                name: "scheme1",
                vestTime: 50,
                cliffTime: 0,
                durationTime: 0,
                periodTime: 420,
                tokenAddress: _DFYTokenContract.address
            }
            await expect(
                _vestingContract.newSchemeInformation(
                    scheme.name, 
                    scheme.vestTime, 
                    scheme.cliffTime, 
                    scheme.durationTime,
                    scheme.periodTime,
                    scheme.tokenAddress
                )
            ).to.be.revertedWith("duration-time-invalid")
        })
        it("create scheme with tokenAddress == 0x0, it should return tokenAddress-invalid", async() => {
            scheme = {
                name: "scheme1",
                vestTime: 50,
                cliffTime: 0,
                durationTime: 21000,
                periodTime: 420,
                tokenAddress: address0x0
            }
            await expect(
                _vestingContract.newSchemeInformation(
                    scheme.name, 
                    scheme.vestTime, 
                    scheme.cliffTime, 
                    scheme.durationTime,
                    scheme.periodTime,
                    scheme.tokenAddress
                )
            ).to.be.revertedWith("tokenAddress-invalid")
        })
        it("create scheme with durationTime < periodTime, it should return duration-time-invalid", async() => {
            scheme = {
                name: "scheme1",
                vestTime: 50,
                cliffTime: 0,
                durationTime: 419,
                periodTime: 420,
                tokenAddress: _DFYTokenContract.address
            }
            await expect(
                _vestingContract.newSchemeInformation(
                    scheme.name, 
                    scheme.vestTime, 
                    scheme.cliffTime, 
                    scheme.durationTime,
                    scheme.periodTime,
                    scheme.tokenAddress
                )
            ).to.be.revertedWith("duration-time-invalid")
        })
        it("create scheme without operator, it should return access deny", async () => {
            scheme = {
                name: "scheme1",
                vestTime: 50,
                cliffTime: 0,
                durationTime: 21000,
                periodTime: 420,
                tokenAddress: _DFYTokenContract.address
            }

            const user1 = _user1.address.toLowerCase()
            await expect(
                _vestingContract.connect(_user1).newSchemeInformation(
                    scheme.name, 
                    scheme.vestTime, 
                    scheme.cliffTime, 
                    scheme.durationTime,
                    scheme.periodTime,
                    scheme.tokenAddress
                )
            ).to.be.revertedWith(`AccessControl: account ${user1} is missing role ${operatorRole}`)
        })
        it("create scheme successfully, it should emit event", async () => {
            scheme = {
                name: "scheme1",
                vestTime: 50,
                cliffTime: 0,
                durationTime: 21000,
                periodTime: 420,
                tokenAddress: _DFYTokenContract.address
            }
            const transaction = await _vestingContract.connect(_deployer).newSchemeInformation(
                    scheme.name, 
                    scheme.vestTime, 
                    scheme.cliffTime, 
                    scheme.durationTime,
                    scheme.periodTime,
                    scheme.tokenAddress
                )
            const txData = await transaction.wait()
            const event = txData.events[0].args
            expect(event.name).to.equal(scheme.name)
            expect(event.vestTime).to.equal(scheme.vestTime)
            expect(event.cliffTime).to.equal(scheme.cliffTime)
            expect(event.durationTime).to.equal(scheme.durationTime)
            expect(event.periodTime).to.equal(scheme.periodTime)
            expect(event.tokenAddress).to.equal(scheme.tokenAddress)

            scheme.schemeId = event.schemeBcId
        })
        it("create vesting information with schemeId = 0, it should return schemeId-invalid", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1900* decimals),
                amountDeposit: BigInt(1900* decimals),
                totalClaimed:0,
                
                startTime: 1644318512,
                tokenRelease: 0,
                isTesting: true
            }
            
            await expect(_vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                0, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )).to.be.revertedWith("schemeId-invalid")

        })
        it("create vesting information with scheme not found, it should return scheme-invalid", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1900* decimals),
                amountDeposit: BigInt(1900* decimals),
                totalClaimed:0,
                startTime: 1644318512,
                tokenRelease: 0,
                isTesting: true
            }
            await expect(_vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                10, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )).to.be.revertedWith("scheme-invalid")
        })
        it("create vesting information with wallet = 0x0, it should return wallet-invalid", async () => {
            vest = {
                wallet: address0x0,
                totalAmount: BigInt(1900* decimals),
                amountDeposit: BigInt(1900* decimals),
                totalClaimed:0,
                schemeId: scheme.schemeId,
                startTime: 1644318512,
                tokenRelease: 0,
                isTesting: true
            }
            const _scheme = await _vestingContract.connect(_deployer).getSchemeInforById(scheme.schemeId)
            await expect(_vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )).to.be.revertedWith("wallet-invalid")
        })
        it("create vesting information with startTime = 0, it should return startTime-invalid", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1900* decimals),
                amountDeposit: BigInt(1900* decimals),
                totalClaimed:0,
                schemeId: scheme.schemeId,
                startTime: 0,
                tokenRelease: 0,
                isTesting: true
            }
            await expect(_vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )).to.be.revertedWith("startTime-invalid")
        })
        it("create vesting information with totalAmount = 0, it should return totalAmount-invalid", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: 0,
                amountDeposit: BigInt(1900* decimals),
                totalClaimed:0,
                schemeId: scheme.schemeId,
                startTime: 1644318512,
                tokenRelease: 0,
                isTesting: true
            }
            await expect(_vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )).to.be.revertedWith("totalAmount-invalid")
        })
        it("create vesting information with totalAmount < totalClaimed, it should return totalAmount-invalid", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1900 * decimals),
                amountDeposit: BigInt(1900 * decimals),
                totalClaimed: BigInt(1901 * decimals),
                schemeId: scheme.schemeId,
                startTime: 1644318512,
                tokenRelease: 0,
                isTesting: true
            }
            await expect(_vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )).to.be.revertedWith("totalAmount-invalid")
        })
        it("create vesting information without operator role, it should return access denied", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1900 * decimals),
                amountDeposit: BigInt(1900 * decimals),
                totalClaimed: 0,
                schemeId: scheme.schemeId,
                startTime: 1644318512,
                tokenRelease: 0,
                isTesting: true
            }
            const user1 = _user1.address.toLowerCase()
            await expect(_vestingContract.connect(_user1).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )).to.be.revertedWith(`AccessControl: account ${user1} is missing role ${operatorRole}`)
        })
        it("create vesting but contract dont have token, it should return ERC20: insufficient allowance", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1900 * decimals),
                amountDeposit: BigInt(1900 * decimals),
                totalClaimed: 0,
                schemeId: scheme.schemeId,
                startTime: 1644318512,
                tokenRelease: 0,
                isTesting: true
            }
            await expect( _vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )).to.be.revertedWith("ERC20: insufficient allowance")
        })
        // for dev
        it("create vesting information successfully with token release equal 0, it should emit event", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1900 * decimals),
                amountDeposit: BigInt(1900 * decimals),
                totalClaimed: 0,
                schemeId: scheme.schemeId,
                startTime: 1644318512,
                tokenRelease: 0,
                //use a flag to define this data either for testing or not, so that i can set duration in test time faster than duration in real time
                isTesting: true
            }
            await _DFYTokenContract.transfer(_deployer.address, BigInt(1900 * decimals))
            await _DFYTokenContract.approve(_vestingContract.address, BigInt(1900 * decimals))
            const transaction = await _vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )
            const txData = await transaction.wait()
            const event = txData.events[3].args
            const vestingInfo = await _vestingContract.connect(_deployer).getVestingInforById(event.vestingBcId)
            expect(event.wallet).to.equal(vest.wallet)
            expect(event.totalAmount).to.equal(vest.totalAmount)
            expect(event.amountDeposit).to.equal(vest.amountDeposit)
            expect(event.schemeBcId).to.equal(vest.schemeId)
            expect(event.status).to.equal(vestingInfo.status)
            expect(event.durationTime).to.equal(scheme.durationTime)
            expect(event.periodTime).to.equal(vestingInfo.periodTime)
            expect(event.numberClaim).to.equal(vestingInfo.numberClaim)
            vestingIds.push(event.vestingBcId)
        })
        it("create vesting information successfully with token release equal 1, it should emit event", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1800 * decimals),
                amountDeposit: BigInt(1800 * decimals),
                totalClaimed: 0,
                schemeId: scheme.schemeId,
                startTime: 1644318512,
                tokenRelease: 1,
                isTesting: true
            }
            await _DFYTokenContract.transfer(_deployer.address, BigInt(1900 * decimals))
            await _DFYTokenContract.approve(_vestingContract.address, BigInt(1900 * decimals))
            const transaction = await _vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )
            const txData = await transaction.wait()
            const event = txData.events[3].args
            const vestingInfo = await _vestingContract.connect(_deployer).getVestingInforById(event.vestingBcId)
            expect(event.wallet).to.equal(vest.wallet)
            expect(event.totalAmount).to.equal(vest.totalAmount)
            expect(event.amountDeposit).to.equal(vest.amountDeposit)
            expect(event.schemeBcId).to.equal(vest.schemeId)
            expect(event.status).to.equal(vestingInfo.status)
            expect(event.durationTime).to.equal(scheme.durationTime)
            expect(event.periodTime).to.equal(vestingInfo.periodTime)
            expect(event.numberClaim).to.equal(vestingInfo.numberClaim)
            // vestingIds.push(event.vestingBcId)
        })
        it("create vesting information successfully with token release equal 2, it should emit event", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1700 * decimals),
                amountDeposit: BigInt(1000 * decimals),
                totalClaimed: BigInt(700 * decimals),
                schemeId: scheme.schemeId,
                startTime: 1644318512,
                tokenRelease: 2,
                isTesting: true
            }
            await _DFYTokenContract.transfer(_deployer.address, BigInt(1900 * decimals))
            await _DFYTokenContract.approve(_vestingContract.address, BigInt(1900 * decimals))
            const transaction = await _vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )
            const txData = await transaction.wait()
            const event = txData.events[3].args
            const vestingInfo = await _vestingContract.connect(_deployer).getVestingInforById(event.vestingBcId)
            expect(event.wallet).to.equal(vest.wallet)
            expect(event.totalAmount).to.equal(vest.totalAmount)
            expect(event.amountDeposit).to.equal(vest.amountDeposit)
            expect(event.schemeBcId).to.equal(vest.schemeId)
            expect(event.status).to.equal(vestingInfo.status)
            expect(event.durationTime).to.equal(scheme.durationTime)
            expect(event.periodTime).to.equal(vestingInfo.periodTime)
            expect(event.numberClaim).to.equal(vestingInfo.numberClaim)
            // vestingIds.push(event.vestingBcId)
        })
        it("create vesting information successfully with token release equal 3, it should emit event", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1700 * decimals),
                amountDeposit: BigInt(1000 * decimals),
                totalClaimed: BigInt(700 * decimals),
                schemeId: scheme.schemeId,
                startTime: 1644318512,
                tokenRelease: 3,
                isTesting: true
            }
            await _DFYTokenContract.transfer(_deployer.address, BigInt(1900 * decimals))
            await _DFYTokenContract.approve(_vestingContract.address, BigInt(1900 * decimals))
            const transaction = await _vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )
            const txData = await transaction.wait()
            const event = txData.events[3].args
            const vestingInfo = await _vestingContract.connect(_deployer).getVestingInforById(event.vestingBcId)
            expect(event.wallet).to.equal(vest.wallet)
            expect(event.totalAmount).to.equal(vest.totalAmount)
            expect(event.amountDeposit).to.equal(vest.amountDeposit)
            expect(event.schemeBcId).to.equal(vest.schemeId)
            expect(event.status).to.equal(vestingInfo.status)
            expect(event.durationTime).to.equal(scheme.durationTime)
            expect(event.periodTime).to.equal(vestingInfo.periodTime)
            expect(event.numberClaim).to.equal(vestingInfo.numberClaim)
            // vestingIds.push(event.vestingBcId)
        })
        it("create vesting information successfully with token release equal 4, it should emit event", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1700 * decimals),
                amountDeposit: BigInt(1000 * decimals),
                totalClaimed: BigInt(700 * decimals),
                schemeId: scheme.schemeId,
                startTime: 1644318512,
                tokenRelease: 4,
                isTesting: true
            }
            await _DFYTokenContract.transfer(_deployer.address, BigInt(1900 * decimals))
            await _DFYTokenContract.approve(_vestingContract.address, BigInt(1900 * decimals))
            const transaction = await _vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )
            const txData = await transaction.wait()
            const event = txData.events[3].args
            const vestingInfo = await _vestingContract.connect(_deployer).getVestingInforById(event.vestingBcId)
            expect(event.wallet).to.equal(vest.wallet)
            expect(event.totalAmount).to.equal(vest.totalAmount)
            expect(event.amountDeposit).to.equal(vest.amountDeposit)
            expect(event.schemeBcId).to.equal(vest.schemeId)
            expect(event.status).to.equal(vestingInfo.status)
            expect(event.durationTime).to.equal(scheme.durationTime)
            expect(event.periodTime).to.equal(vestingInfo.periodTime)
            expect(event.numberClaim).to.equal(vestingInfo.numberClaim)
            // vestingIds.push(event.vestingBcId)
        })
        // for prod
        it("create vesting information successfully with token release equal 0, it should emit event", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1900 * decimals),
                amountDeposit: BigInt(1900 * decimals),
                totalClaimed: 0,
                schemeId: scheme.schemeId,
                startTime: 1644318512,
                tokenRelease: 0,
                //use a flag to define this data either for testing or not, so that i can set duration in test time faster than duration in real time
                isTesting: false
            }
            await _DFYTokenContract.transfer(_deployer.address, BigInt(1900 * decimals))
            await _DFYTokenContract.approve(_vestingContract.address, BigInt(1900 * decimals))
            const transaction = await _vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )
            const txData = await transaction.wait()
            const event = txData.events[3].args
            const vestingInfo = await _vestingContract.connect(_deployer).getVestingInforById(event.vestingBcId)
            expect(event.wallet).to.equal(vest.wallet)
            expect(event.totalAmount).to.equal(vest.totalAmount)
            expect(event.amountDeposit).to.equal(vest.amountDeposit)
            expect(event.schemeBcId).to.equal(vest.schemeId)
            expect(event.status).to.equal(vestingInfo.status)
            expect(event.durationTime).to.equal(scheme.durationTime)
            expect(event.periodTime).to.equal(vestingInfo.periodTime)
            expect(event.numberClaim).to.equal(vestingInfo.numberClaim)
            // vestingIds.push(event.vestingBcId)
        })
        it("create vesting information successfully with token release equal 1, it should emit event", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1800 * decimals),
                amountDeposit: BigInt(1800 * decimals),
                totalClaimed: 0,
                schemeId: scheme.schemeId,
                startTime: 1644318512,
                tokenRelease: 1,
                isTesting: false
            }
            await _DFYTokenContract.transfer(_deployer.address, BigInt(1900 * decimals))
            await _DFYTokenContract.approve(_vestingContract.address, BigInt(1900 * decimals))
            const transaction = await _vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )
            const txData = await transaction.wait()
            const event = txData.events[3].args
            const vestingInfo = await _vestingContract.connect(_deployer).getVestingInforById(event.vestingBcId)
            expect(event.wallet).to.equal(vest.wallet)
            expect(event.totalAmount).to.equal(vest.totalAmount)
            expect(event.amountDeposit).to.equal(vest.amountDeposit)
            expect(event.schemeBcId).to.equal(vest.schemeId)
            expect(event.status).to.equal(vestingInfo.status)
            expect(event.durationTime).to.equal(scheme.durationTime)
            expect(event.periodTime).to.equal(vestingInfo.periodTime)
            expect(event.numberClaim).to.equal(vestingInfo.numberClaim)
            // vestingIds.push(event.vestingBcId)
        })
        it("create vesting information successfully with token release equal 2, it should emit event", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1700 * decimals),
                amountDeposit: BigInt(1000 * decimals),
                totalClaimed: BigInt(700 * decimals),
                schemeId: scheme.schemeId,
                startTime: 1644318512,
                tokenRelease: 2,
                isTesting: false
            }
            await _DFYTokenContract.transfer(_deployer.address, BigInt(1900 * decimals))
            await _DFYTokenContract.approve(_vestingContract.address, BigInt(1900 * decimals))
            const transaction = await _vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )
            const txData = await transaction.wait()
            const event = txData.events[3].args
            const vestingInfo = await _vestingContract.connect(_deployer).getVestingInforById(event.vestingBcId)
            expect(event.wallet).to.equal(vest.wallet)
            expect(event.totalAmount).to.equal(vest.totalAmount)
            expect(event.amountDeposit).to.equal(vest.amountDeposit)
            expect(event.schemeBcId).to.equal(vest.schemeId)
            expect(event.status).to.equal(vestingInfo.status)
            expect(event.durationTime).to.equal(scheme.durationTime)
            expect(event.periodTime).to.equal(vestingInfo.periodTime)
            expect(event.numberClaim).to.equal(vestingInfo.numberClaim)
            // vestingIds.push(event.vestingBcId)
        })
        it("create vesting information successfully with token release equal 3, it should emit event", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1700 * decimals),
                amountDeposit: BigInt(1000 * decimals),
                totalClaimed: BigInt(700 * decimals),
                schemeId: scheme.schemeId,
                startTime: 1644318512,
                tokenRelease: 3,
                isTesting: false
            }
            await _DFYTokenContract.transfer(_deployer.address, BigInt(1900 * decimals))
            await _DFYTokenContract.approve(_vestingContract.address, BigInt(1900 * decimals))
            const transaction = await _vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )
            const txData = await transaction.wait()
            const event = txData.events[3].args
            const vestingInfo = await _vestingContract.connect(_deployer).getVestingInforById(event.vestingBcId)
            expect(event.wallet).to.equal(vest.wallet)
            expect(event.totalAmount).to.equal(vest.totalAmount)
            expect(event.amountDeposit).to.equal(vest.amountDeposit)
            expect(event.schemeBcId).to.equal(vest.schemeId)
            expect(event.status).to.equal(vestingInfo.status)
            expect(event.durationTime).to.equal(scheme.durationTime)
            expect(event.periodTime).to.equal(vestingInfo.periodTime)
            expect(event.numberClaim).to.equal(vestingInfo.numberClaim)
            // vestingIds.push(event.vestingBcId)
        })
        it("create vesting information successfully with token release equal 4, it should emit event", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1700 * decimals),
                amountDeposit: BigInt(1000 * decimals),
                totalClaimed: BigInt(700 * decimals),
                schemeId: scheme.schemeId,
                startTime: 1644318512,
                tokenRelease: 4,
                isTesting: false
            }
            await _DFYTokenContract.transfer(_deployer.address, BigInt(1900 * decimals))
            await _DFYTokenContract.approve(_vestingContract.address, BigInt(1900 * decimals))
            const transaction = await _vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )
            const txData = await transaction.wait()
            const event = txData.events[3].args
            const vestingInfo = await _vestingContract.connect(_deployer).getVestingInforById(event.vestingBcId)
            expect(event.wallet).to.equal(vest.wallet)
            expect(event.totalAmount).to.equal(vest.totalAmount)
            expect(event.amountDeposit).to.equal(vest.amountDeposit)
            expect(event.schemeBcId).to.equal(vest.schemeId)
            expect(event.status).to.equal(vestingInfo.status)
            expect(event.durationTime).to.equal(scheme.durationTime)
            expect(event.periodTime).to.equal(vestingInfo.periodTime)
            expect(event.numberClaim).to.equal(vestingInfo.numberClaim)
            // vestingIds.push(event.vestingBcId)
        })
        it("create vesting without amount deposit, it should emit event with amount deposit equal 0 and status equal 0", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1900 * decimals),
                amountDeposit: 0,
                totalClaimed: 0,
                schemeId: vest.schemeId,
                startTime: parseInt(Date.now()/1000),
                tokenRelease: 0,
                isTesting: true
            }

            const transaction = await _vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )
            const txData = await transaction.wait()
            const event = txData.events[0].args

            const vestingInfo = await _vestingContract.connect(_deployer).getVestingInforById(event.vestingBcId)
            expect(event.wallet).to.equal(vest.wallet)
            expect(event.totalAmount).to.equal(vest.totalAmount)
            expect(event.amountDeposit).to.equal(vest.amountDeposit)
            expect(event.schemeBcId).to.equal(vest.schemeId)
            expect(event.status).to.equal(vestingInfo.status)
            expect(event.durationTime).to.equal(scheme.durationTime)
            expect(event.periodTime).to.equal(vestingInfo.periodTime)
            expect(event.numberClaim).to.equal(vestingInfo.numberClaim)
            vestingIds.push(event.vestingBcId)
        })
        it("claim with vesting information not active, it should emit event with {amount = 0, vestingIds[], amounts[]}", async () => {
            const _vestingIds = vestingIds
            _vestingIds.shift()
            const transaction = await _vestingContract.connect(_deployer).claim(_vestingIds, _DFYTokenContract.address)
            const txData = await transaction.wait()
            const event = txData.events[0].args
            expect(event.amount.toString()).to.equal("0")
            expect(event.vestingIds).to.be.empty
            expect(event.amounts).to.be.empty
        })
        
        it("claim with vesting information now < startTime, it should emit event with {amount = 0, vestingIds[], amounts[]}", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1900 * decimals),
                amountDeposit: BigInt(1900 * decimals),
                totalClaimed: 0,
                schemeId: scheme.schemeId,
                // set startTime greater than now
                startTime: parseInt(Date.now()/1000 + 1000),
                tokenRelease: 0,
                isTesting: true
            }
            await _DFYTokenContract.transfer(_deployer.address, BigInt(1900 * decimals))
            await _DFYTokenContract.approve(_vestingContract.address, BigInt(1900 * decimals))
            const vestingTransaction = await _vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )
            const vestingTxData = await vestingTransaction.wait()
            const vestingEvent = vestingTxData.events[3].args
            const _vestingIds = []

            _vestingIds.push(vestingEvent.vestingBcId)
            const transaction = await _vestingContract.connect(_deployer).claim(_vestingIds, _DFYTokenContract.address)
            const txData = await transaction.wait()
            const event = txData.events[0].args
            expect(event.amount.toString()).to.equal("0")
            expect(event.vestingIds).to.be.empty
            expect(event.amounts).to.be.empty
        })
        it("claim with vesting information now > startTime and durationTime between now and startTime < periodTime, it should emit event with {amount = 0, vestingIds[], amounts[]}", async () => {
            vest = {
                wallet: _owner.address,
                totalAmount: BigInt(1900 * decimals),
                amountDeposit: BigInt(1900 * decimals),
                totalClaimed: 0,
                schemeId: scheme.schemeId,
                // set startTime greater than now
                startTime: parseInt(Date.now()/1000 + 30),
                tokenRelease: 0,
                isTesting: true
            }
            await _DFYTokenContract.transfer(_deployer.address, BigInt(1900 * decimals))
            await _DFYTokenContract.approve(_vestingContract.address, BigInt(1900 * decimals))
            const vestingTransaction = await _vestingContract.connect(_deployer).newVestingInformation(
                vest.wallet, 
                vest.totalAmount, 
                vest.amountDeposit, 
                vest.totalClaimed,
                vest.schemeId, 
                vest.startTime,
                vest.tokenRelease,
                vest.isTesting
            )
            const vestingTxData = await vestingTransaction.wait()
            const vestingEvent = vestingTxData.events[3].args
            const _vestingIds = []

            _vestingIds.push(vestingEvent.vestingBcId)
            const transaction = await _vestingContract.connect(_deployer).claim(_vestingIds, _DFYTokenContract.address)
            const txData = await transaction.wait()
            const event = txData.events[0].args
            expect(event.amount.toString()).to.equal("0")
            expect(event.vestingIds).to.be.empty
            expect(event.amounts).to.be.empty
        })
        it("claim successfully", async () => {
            const _vestingIds = []
            _vestingIds.push(1)
            console.log("user1: ", _owner.address)
            const vestingInfo = await _vestingContract.connect(_deployer).getVestingInforById(1)
            const transaction = await _vestingContract.connect(_owner).claim(_vestingIds, _DFYTokenContract.address)
            console.log(2)
            const txData = await transaction.wait()
            console.log("txData: ", txData)
            const event = txData.events[1].args
            console.log(4)
            console.log("event.amounts: ", event.amounts[0])
            console.log("vestingInfo: ", vestingInfo)
            console.log("event: ", event)
            expect(event.amount.toString()).to.equal(vestingInfo.withdrawable)
            expect(event.amounts[0]).to.equal(vestingInfo.withdrawable)
        })
        it("claim with vesting information success, it should emit event with {amount = 0, vestingIds[], amounts[]}", async () => {
            const _vestingIds = []
            _vestingIds.push(1)
            const transaction = await _vestingContract.connect(_deployer).claim(_vestingIds, _DFYTokenContract.address)
            const txData = await transaction.wait()
            const event = txData.events[0].args
            expect(event.amount.toString()).to.equal("0")
            expect(event.vestingIds).to.be.empty
            expect(event.amounts).to.be.empty
        })
        it("claim all with vesting information success,", async () => {
            vest1 = {
                wallet: _owner.address,
                totalAmount: BigInt(1900 * decimals),
                amountDeposit: BigInt(1900 * decimals),
                totalClaimed: 0,
                schemeId: scheme.schemeId,
                // set startTime greater than now
                startTime: parseInt(Date.now()/1000 - 60),
                tokenRelease: 0,
                isTesting: true
            }
            vest2 = {
                wallet: _owner.address,
                totalAmount: BigInt(900 * decimals),
                amountDeposit: BigInt(900 * decimals),
                totalClaimed: 0,
                schemeId: scheme.schemeId,
                // set startTime greater than now
                startTime: parseInt(Date.now()/1000 - 120),
                tokenRelease: 0,
                isTesting: true
            }
            await _DFYTokenContract.transfer(_deployer.address, BigInt(2800 * decimals))
            await _DFYTokenContract.approve(_vestingContract.address, BigInt(2800 * decimals))
            const vestingTransaction1 = await _vestingContract.connect(_deployer).newVestingInformation(
                vest1.wallet, 
                vest1.totalAmount, 
                vest1.amountDeposit, 
                vest1.totalClaimed,
                vest1.schemeId, 
                vest1.startTime,
                vest1.tokenRelease,
                vest1.isTesting
            )
            const vestingTransaction2 = await _vestingContract.connect(_deployer).newVestingInformation(
                vest2.wallet, 
                vest2.totalAmount, 
                vest2.amountDeposit, 
                vest2.totalClaimed,
                vest2.schemeId, 
                vest2.startTime,
                vest2.tokenRelease,
                vest2.isTesting
            )
            const vestingTxData1 = await vestingTransaction1.wait()
            const vestingTxData2 = await vestingTransaction2.wait()
            const vestingEvent1 = vestingTxData1.events[3].args
            const vestingEvent2 = vestingTxData2.events[3].args
            const _vestingIds = []

            _vestingIds.push(vestingEvent1.vestingBcId)
            _vestingIds.push(vestingEvent2.vestingBcId)
            const vestingInfo1 = await _vestingContract.connect(_deployer).getVestingInforById(vestingEvent1.vestingBcId)
            const vestingInfo2 = await _vestingContract.connect(_deployer).getVestingInforById(vestingEvent2.vestingBcId)
            console.log("vestingInfo1: ", vestingInfo1)
            console.log("vestingInfo2: ", vestingInfo2)
            const total = vestingInfo1.withdrawable.add(vestingInfo2.withdrawable)
            const transaction = await _vestingContract.connect(_owner).claim(_vestingIds, _DFYTokenContract.address)
            const txData = await transaction.wait()
            const event = txData.events[1].args
            console.log("event: ", event)
            expect(event.amount.toString()).to.equal(total)
            expect(event.amounts[0]).to.equal(vestingInfo1.withdrawable)
            expect(event.amounts[1]).to.equal(vestingInfo2.withdrawable)
        })
        it("get vesting id by wallet", async () => {
            const vestingIds = await _vestingContract.getListVestIdsByWallet(_deployer.address)
            console.log("vestingIds: ", vestingIds)
        })
        it("setPreventiveWallet", async () => {
            const setPreventiveWallet = await _vestingContract.setPreventiveWallet(_user1.address)
            const txData = await setPreventiveWallet.wait()
            const event = txData.events[0].args
            expect(event.preventiveWallet).to.equalIgnoreCase(_user1.address);
        })
        it("emergencyWithdraw but contract done have any token", async () => {
            await _hubContract.connect(_deployer).grantRole(pauseRole, _deployer.address)
            await _vestingContract.connect(_deployer).pause();
            const transaction = await _vestingContract.connect(_deployer).emergencyWithdraw(_DFYTokenContract.address)
            const txData = await transaction.wait()
            const event = txData.events[1].args
            console.log("event: ", event)
            
        })
    })
})