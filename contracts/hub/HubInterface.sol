// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface HubInterface {
    /** Data Types */
    struct Registry {
        address contractAddress;
        string contractName;
    }

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

    function registerContract(
        bytes4 signature,
        address contractAddress,
        string calldata contractName
    ) external;

    function getContractAddress(bytes4 signature)
        external
        view
        returns (address contractAddress, string memory contractName);

    function getSystemConfig()
        external
        view
        returns (address feeWallet, address feeToken);

    function getWhitelistCollateral_NFT(address collectionAddress)
        external
        view
        returns (uint256 status);

    function getPawnNFTConfig()
        external
        view
        returns (
            uint256 zoom,
            uint256 feeRate,
            uint256 penaltyRate,
            uint256 prepaidFeeRate,
            uint256 lateThreshold
        );

    function getWhitelistCollateral(address cryptoTokenAddress)
        external
        view
        returns (uint256 status);

    function getPawnConfig()
        external
        view
        returns (
            uint256 zoom,
            uint256 feeRate,
            uint256 penaltyRate,
            uint256 prepaidFeeRate,
            uint256 lateThreshold
        );

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

    function setWhitelistCollateral_NFT(
        address collectionAddress,
        uint256 status
    ) external;
}