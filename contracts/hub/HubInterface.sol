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
    /** ROLES */
    function AdminRole() external pure returns (bytes32);
    function OperatorRole() external pure returns (bytes32);
    function PauserRole() external pure returns (bytes32);
    function EvaluatorRole() external pure returns (bytes32);

    function registerContract(bytes4 signature, address contractAddress)
        external;

    function getContractAddress(bytes4 signature)
        external
        view
        returns (address contractAddres);

    function getSystemConfig() external view returns (address, address);

    function getNFTCollectionConfig()
        external
        view
        returns (uint256 collectionCreatingFee, uint256 mintingFee);

    function getNFTMarketConfig()
        external
        view
        returns (
            uint256 zoom,
            uint256 marketFeeRate,
            address marketFeeWallet
        );
}
