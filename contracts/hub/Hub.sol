// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "../libs/CommonLib.sol";
import "./HubLib.sol";
import "./HubInterface.sol";

contract Hub is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    HubInterface
{
    using AddressUpgradeable for address;

    mapping(bytes4 => Registry) public ContractRegistry;

    SystemConfig public systemConfig;
    PawnConfig public pawnConfig;
    PawnNFTConfig public pawnNFTConfig;
    NFTCollectionConfig public nftCollectionConfig;
    NFTMarketConfig public nftMarketConfig;

    // TODO: New state variables must go below this line -----------------------------

    /** ==================== Contract initializing & configuration ==================== */
    function initialize(
        address feeWallet,
        address feeToken,
        address operator
    ) public initializer {
        __UUPSUpgradeable_init();
        __Pausable_init();
        __AccessControl_init();

        _setupRole(HubRoles.DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(HubRoles.OPERATOR_ROLE, operator);
        _setupRole(HubRoles.PAUSER_ROLE, msg.sender);
        _setupRole(HubRoles.EVALUATOR_ROLE, msg.sender);
        _setupRole(HubRoles.REGISTRANT, msg.sender);

        // Set OPERATOR_ROLE as EVALUATOR_ROLE's Admin Role
        _setRoleAdmin(HubRoles.EVALUATOR_ROLE, HubRoles.OPERATOR_ROLE);

        systemConfig.systemFeeWallet = feeWallet;
        systemConfig.systemFeeToken = feeToken;
    }

    modifier whenContractNotPaused() {
        _whenNotPaused();
        _;
    }

    function _whenNotPaused() private view {
        require(!paused(), "Pausable: paused");
    }

    function pause() external onlyRole(HubRoles.PAUSER_ROLE) {
        _pause();
    }

    function unPause() external onlyRole(HubRoles.PAUSER_ROLE) {
        _unpause();
    }

    function AdminRole() public pure override returns (bytes32) {
        return HubRoles.DEFAULT_ADMIN_ROLE;
    }

    function OperatorRole() public pure override returns (bytes32) {
        return HubRoles.OPERATOR_ROLE;
    }

    function PauserRole() public pure override returns (bytes32) {
        return HubRoles.PAUSER_ROLE;
    }

    function EvaluatorRole() public pure override returns (bytes32) {
        return HubRoles.EVALUATOR_ROLE;
    }

    /** ==================== Hub operation functions ==================== */
    function registerContract(
        bytes4 signature,
        address contractAddress,
        string calldata contractName
    ) external override onlyRole(HubRoles.REGISTRANT) {
        ContractRegistry[signature] = Registry(contractAddress, contractName);
    }

    function getContractAddress(bytes4 signature)
        external
        view
        override
        returns (address contractAddress, string memory contractName)
    {
        Registry memory _registry = ContractRegistry[signature];
        contractAddress = _registry.contractAddress;
        contractName = _registry.contractName;
    }

    function setSystemConfig(address feeWallet, address feeToken)
        external
        onlyRole(HubRoles.DEFAULT_ADMIN_ROLE)
    {
        if (feeWallet != address(0)) {
            systemConfig.systemFeeWallet = feeWallet;
        }

        if (feeToken != address(0)) {
            systemConfig.systemFeeToken = feeToken;
        }
    }

    function getSystemConfig()
        external
        view
        override
        returns (address feeWallet, address feeToken)
    {
        feeWallet = systemConfig.systemFeeWallet;
        feeToken = systemConfig.systemFeeToken;
    }

    function setNFTConfiguration(
        int256 collectionCreatingFee,
        int256 mintingFee
    ) external onlyRole(HubRoles.DEFAULT_ADMIN_ROLE) {
        if (collectionCreatingFee >= 0) {
            nftCollectionConfig.collectionCreatingFee = CommonLib.abs(
                collectionCreatingFee
            );
        }
        if (mintingFee >= 0) {
            nftCollectionConfig.mintingFee = CommonLib.abs(mintingFee);
        }
    }

    function setNFTMarketConfig(
        int256 zoom,
        int256 marketFeeRate,
        address marketFeeWallet
    ) external onlyRole(HubRoles.DEFAULT_ADMIN_ROLE) {
        if (zoom >= 0) {
            nftMarketConfig.ZOOM = CommonLib.abs(zoom);
        }
        if (marketFeeRate >= 0) {
            nftMarketConfig.marketFeeRate = CommonLib.abs(marketFeeRate);
        }
        if (marketFeeWallet != address(0) && !marketFeeWallet.isContract()) {
            nftMarketConfig.marketFeeWallet = marketFeeWallet;
        }
    }

    function getNFTCollectionConfig()
        external
        view
        override
        returns (uint256 collectionCreatingFee, uint256 mintingFee)
    {
        collectionCreatingFee = nftCollectionConfig.collectionCreatingFee;
        mintingFee = nftCollectionConfig.mintingFee;
    }

    function getNFTMarketConfig()
        external
        view
        override
        returns (
            uint256 zoom,
            uint256 marketFeeRate,
            address marketFeeWallet
        )
    {
        zoom = nftMarketConfig.ZOOM;
        marketFeeRate = nftMarketConfig.marketFeeRate;
        marketFeeWallet = nftMarketConfig.marketFeeWallet;
    }

    /** ==================== Standard interface function implementations ==================== */

    function _authorizeUpgrade(address)
        internal
        override
        onlyRole(HubRoles.DEFAULT_ADMIN_ROLE)
    {}

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
