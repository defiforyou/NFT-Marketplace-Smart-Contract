//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "../libs/ArrayLib.sol";
import "../base/BaseContract.sol";
import "./IVesting.sol";

contract Vesting is 
    BaseContract,
    IVesting
{
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter private _vestingIds;
    CountersUpgradeable.Counter private _schemeIds;

    // @dev get vestingInformation by index
    mapping(uint256 => VestingInformation) vestingInfors;
    // @dev get vestingInformations list by wallet
    mapping(address => uint256[]) walletToVestingInfor;
    // @dev get schemeInfo by index
    mapping(uint256 => SchemeInformation) schemeInfos;

    // @dev declare variables for role
    address public preventiveWallet;

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC165Upgradeable, IERC165Upgradeable)
        returns (bool)
    {
        return
            interfaceId == type(IVesting).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function signature() external pure override returns (bytes4) {
        return type(IVesting).interfaceId;
    }

    function initialize(address _preventiveWallet, address _hub)
        public
        initializer
    {
        __BaseContract_init(_hub);
        preventiveWallet = _preventiveWallet;
    }


    function emergencyWithdraw(address _erc20Token) public override whenPaused onlyAdmin {
        uint256 balanceOfThis = IERC20Upgradeable(_erc20Token).balanceOf(address(this));
        IERC20Upgradeable(_erc20Token).transfer(preventiveWallet, balanceOfThis);
        emit EmergencyWithdraw(preventiveWallet, balanceOfThis);
    }

    function setPreventiveWallet(address preventiveAddress) public override onlyAdmin {
        preventiveWallet = preventiveAddress;
        emit PreventiveWallet(preventiveWallet);
    }

    //@dev add token from admin to contract
    function addToken(uint256 _amount, uint256 _vestingId) public override onlyOperator {

        VestingInformation memory vestingInfo = vestingInfors[_vestingId];
        SchemeInformation memory schemeInfo = schemeInfos[vestingInfo.schemeId];
        require(_amount == (vestingInfo.totalAmount - vestingInfo.totalClaimed), "amount-invalid");
        if(vestingInfo.status == 0) {
            vestingInfo.status = 1;
        }
        IERC20Upgradeable(schemeInfo.tokenAddress).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );
        emit AddToken(_amount, _vestingId);
    }

    function newSchemeInformation(
        string memory name,
        uint256 vestTime,
        uint256 cliffTime,
        uint256 durationTime,
        uint256 periodTime,
        address tokenAddress
    ) public onlyOperator {
        require(vestTime > 0, "vest-claim-invalid");
        require(cliffTime >= 0, "cliff-claim-invalid");
        require(durationTime > 0, "duration-time-invalid");
        require(tokenAddress != address(0), "tokenAddress-invalid");
        require(bytes(name).length > 0, "scheme-name-invalid");
        require(durationTime > periodTime, "duration-time-invalid");
        _schemeIds.increment();
        uint256 id = _schemeIds.current();
        SchemeInformation storage schemeInfo = schemeInfos[id];
        schemeInfo.tokenAddress = tokenAddress;
        schemeInfo.name = name;
        schemeInfo.vestTime = vestTime;
        schemeInfo.cliffTime = cliffTime;
        schemeInfo.durationTime = durationTime;
        schemeInfo.periodTime = periodTime;
        emit NewSchemeInformation(
            name,
            schemeInfo.tokenAddress, 
            id,
            schemeInfo.cliffTime,
            schemeInfo.vestTime,
            schemeInfo.durationTime,
            schemeInfo.periodTime
        );
    }

    function newVestingInformation(
        address wallet,
        uint256 totalAmount,
        uint256 amountDeposit,
        uint256 totalClaimed,
        uint256 schemeId,
        uint256 startTime
    ) public override onlyOperator {
        SchemeInformation storage schemeInfo = schemeInfos[schemeId];
        require(schemeId > 0, "schemeId-invalid");
        require(schemeInfo.durationTime > 0, "scheme-invalid");
        require(wallet != address(0), "wallet-invalid");
        require(startTime > 0, "startTime-invalid");
        require(totalAmount > 0, "totalAmount-invalid");
        require(totalAmount > totalClaimed, "totalAmount-invalid");

        _vestingIds.increment();
        VestingInformation storage vestingInfo = vestingInfors[_vestingIds.current()];
        walletToVestingInfor[msg.sender].push(_vestingIds.current());
        vestingInfo.totalAmount = totalAmount;
        vestingInfo.wallet = wallet;
        vestingInfo.schemeId = schemeId;
        // @dev get duration of cliff time

        vestingInfo.startTime = startTime + schemeInfo.cliffTime;
        vestingInfo.totalClaimed = totalClaimed;
        
        vestingInfo.status = 0;
        if(amountDeposit > 0) {
            addToken(amountDeposit, _vestingIds.current());
            vestingInfo.status = 1;
        }
        emit NewVestingInformation(
            wallet, 
            _vestingIds.current(), 
            schemeId, 
            amountDeposit, 
            totalAmount,
            vestingInfo.totalClaimed,
            startTime,
            vestingInfo.status
        );
    }

    function getListVestIdsByWallet(address _wallet) public override view returns(uint256[] memory) {
        return walletToVestingInfor[_wallet];
    }

    function getSchemeInforById(uint256 _schemeId) public override view returns(
        string memory name,
        address tokenAddress,
        uint256 durationTime,
        uint256 vestTime,
        uint256 cliffTime
    ) {
        SchemeInformation memory schemeInfo = schemeInfos[_schemeId];
        name = schemeInfo.name;
        tokenAddress = schemeInfo.tokenAddress;
        durationTime = schemeInfo.durationTime;
        vestTime = schemeInfo.vestTime;
        cliffTime = schemeInfo.cliffTime;
    }

    function getVestingInforById(uint256 _vestingId) public override view returns(
        address wallet,
        uint256 schemeId,
        uint256 startTime,
        uint256 totalAmount,
        uint256 totalClaimed,
        uint8 status,
        uint256 withdrawable
    ) {
        VestingInformation storage vestingInfo = vestingInfors[_vestingId];
        wallet = vestingInfo.wallet;
        totalAmount = vestingInfo.totalAmount;
        totalClaimed = vestingInfo.totalClaimed;
        schemeId = vestingInfo.schemeId;
        startTime = vestingInfo.startTime;
        status = vestingInfo.status;
        withdrawable = _getAmountCanClaim(_vestingId);
    }

    function claim(uint256[] memory _vestingIdsList, address tokenAddress) public override nonReentrant whenNotPaused {
        require(!msg.sender.isContract(), "caller-invalid");
        
        uint256 withdrawable = 0;
        uint256 countVestId = 0;

        // @dev get list vesting can claim token
        for (uint256 i = 0; i < _vestingIdsList.length; i++) {
            if(vestingInfors[_vestingIdsList[i]].status == 1 
                && vestingInfors[_vestingIdsList[i]].wallet == msg.sender
                && _getAmountCanClaim(_vestingIdsList[i]) > 0) {
                countVestId++;
            }
        }

        uint256[] memory vestIdsList = new uint256[](countVestId);
        uint256[] memory amounts = new uint256[](countVestId);
        uint256 count = 0;
        for (uint256 i = 0; i < vestIdsList.length; i++) {
            VestingInformation storage vestingInfo = vestingInfors[_vestingIdsList[i]];
            if(vestingInfo.status == 1 && vestingInfo.wallet == msg.sender) {
                uint256 amountable = _getAmountCanClaim(_vestingIdsList[i]);
                withdrawable = withdrawable.add(amountable);
                vestingInfo.totalClaimed = vestingInfo.totalClaimed.add(withdrawable);
                vestIdsList[count] = _vestingIdsList[i];
                amounts[count] = amountable;
                count++;
            }
            if(vestingInfo.totalClaimed == vestingInfo.totalAmount) {
                vestingInfo.status = 2;
            }
        }
        require(IERC20Upgradeable(tokenAddress).balanceOf(address(this)) >= withdrawable, "contract-dont-have-enough-token-to-transfer");
        if(withdrawable != 0) {
            IERC20Upgradeable(tokenAddress).transfer(msg.sender, withdrawable);
        }
        
        emit Claim(msg.sender, withdrawable, vestIdsList);
    }

    function _getAmountCanClaim(uint256 _vestingId) internal view returns(uint256) {
        VestingInformation memory vestingInfo = vestingInfors[_vestingId];
        SchemeInformation memory schemeInfo = schemeInfos[vestingInfo.schemeId];
        uint256 withdrawable = 0;
        uint256 endTime = vestingInfo.startTime.add(schemeInfo.durationTime);
        if (block.timestamp < endTime && block.timestamp > vestingInfo.startTime && vestingInfo.status == 1) {
            if (vestingInfo.totalClaimed == vestingInfo.totalAmount) {
                return 0;
            }
            uint256 timeFromStart = block.timestamp - vestingInfo.startTime;
            uint256 vestedSlicePeriods = timeFromStart/schemeInfo.periodTime;
            uint256 vestedSeconds = vestedSlicePeriods*schemeInfo.periodTime;
            withdrawable = (vestingInfo.totalAmount * vestedSeconds/schemeInfo.durationTime);
            if (withdrawable > vestingInfo.totalClaimed) {
                withdrawable = withdrawable - vestingInfo.totalClaimed;
            }
            ArrayLib.divRound(withdrawable);
        } else if (block.timestamp >= endTime) {
            withdrawable = vestingInfo.totalAmount.sub(vestingInfo.totalClaimed);
        }
        return withdrawable;
    }

}
