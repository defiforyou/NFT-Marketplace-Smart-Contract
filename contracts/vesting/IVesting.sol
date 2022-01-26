// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "../base/BaseInterface.sol";

interface IVesting is BaseInterface {
    /** Datatypes */
    struct VestingInformation {
        address wallet;
        uint256 schemeId;
        uint256 startTime;
        uint256 totalAmount;
        uint256 totalClaimed;
        // @dev 0: inactive, 1: active, 2: completed
        uint8 status;
    }
    
    struct SchemeInformation {
        string name;
        uint256 vestTime;
        uint256 cliffTime;
        uint256 durationTime;
        uint256 periodTime;
        address tokenAddress;
    }

    // @dev create vesting event
    event NewVestingInformation(
        address wallet,
        uint256 vestingBcId,
        uint256 schemeBcId,
        uint256 amountDeposit,
        uint256 totalAmount,
        uint256 totalClaimed,
        uint256 startTime,
        uint8 status
    );
    
    // @dev create scheme event
    event NewSchemeInformation(
        string name,
        address tokenAddress,
        uint256 schemeBcId,
        uint256 cliffTime,
        uint256 vestTime,
        uint256 durationTime,
        uint256 periodTime
    );

    event AddToken(uint256 amount, uint256 vestingBcId);
    event Claim(address wallet, uint256 amount, uint256[] vestingIds);
    event EmergencyWithdraw(address preventiveWallet, uint256 amount);
    event PreventiveWallet(address preventiveWallet);

    /** Functions */
    function emergencyWithdraw(address _erc20Token) external ;

    function setPreventiveWallet(address preventiveAddress) external;
    function addToken(uint256 _amount, uint256 _vestingId) external;

    function newSchemeInformation(
        string memory name,
        uint256 vestTime,
        uint256 cliffTime,
        uint256 durationTime,
        uint256 periodTime,
        address tokenAddress
    ) external;

    function newVestingInformation(
        address wallet,
        uint256 totalAmount,
        uint256 amountDeposit,
        uint256 totalClaimed,
        uint256 schemeId,
        uint256 startTime
    ) external;

    function getListVestIdsByWallet(address _wallet) external view returns(uint256[] memory);

    function getSchemeInforById(uint256 _schemeId) external view returns(
        string memory name,
        address tokenAddress,
        uint256 durationTime,
        uint256 vestTime,
        uint256 cliffTime
    );

    function getVestingInforById(uint256 _vestingId) external view returns(
        address wallet,
        uint256 schemeId,
        uint256 startTime,
        uint256 totalAmount,
        uint256 totalClaimed,
        uint8 status,
        uint256 withdrawable
    );

    function claim(uint256[] memory _vestingIdsList, address tokenAddress) external;
    
}
