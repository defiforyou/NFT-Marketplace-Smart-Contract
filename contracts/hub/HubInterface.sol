// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface HubInterface {
    /** Data Types */
    struct SystemConfig {
        address systemFeeWallet;
        address systemFeeToken;
    }

    struct PawnConfig {
        uint256 ZOOM;
        uint256 systemFeeRate;
        uint256 penaltyRate;
        uint256 prepaidFeeRate;
        uint256 lateThreshold;
        mapping(address => uint256) whitelistedCollateral;
    }

    struct PawnNFTConfig {
        uint256 ZOOM;
        uint256 systemFeeRate;
        uint256 penaltyRate;
        uint256 prepaidFeeRate;
        uint256 lateThreshold;
        mapping(address => uint256) whitelistedEvaluationContract;
        mapping(address => uint256) whitelistedCollateral;
    }

    struct NFTCollectionConfig {
        uint256 collectionCreatingFee;
        uint256 mintingFee;
    }

    struct NFTMarketConfig {
        uint256 ZOOM;
        uint256 marketFeeRate;
        address marketFeeWallet;
    }

    /** Functions */
    function getSystemConfig() external view returns (address, address);

    function getNFTCollectionConfig() external view returns (uint256, uint256);

    function getNFTMarketConfig() external view returns (uint256, uint256, address);
}
