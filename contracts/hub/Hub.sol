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
import "../access/DFY-AccessControl.sol";
import "./HubInterface.sol";

contract Hub is
    Initializable,
    UUPSUpgradeable,
    PausableUpgradeable,
    HubInterface,
    DFYAccessControl
{
    using AddressUpgradeable for address;

    mapping(bytes4 => address) public ContractRegistry;

    SystemConfig public systemConfig;
    PawnConfig public pawnConfig;
    PawnNFTConfig public pawnNFTConfig;
    NFTCollectionConfig public nftCollectionConfig;
    NFTMarketConfig public nftMarketConfig;

    // TODO: New state variables must go below this line -----------------------------

    /** ==================== Contract initializing & configuration ==================== */
    function initialize(address feeWallet, address feeToken)
        public
        initializer
    {
        __UUPSUpgradeable_init();
        __Pausable_init();

        __DFYAccessControl_init();

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

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unPause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /** ==================== Hub operation functions ==================== */
    function setSystemFeeToken(address feeToken)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        systemConfig.systemFeeToken = feeToken;
    }

    function setSystemFeeWallet(address feeWallet)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        systemConfig.systemFeeWallet = feeWallet;
    }

    function setNFTConfiguration(
        int256 collectionCreatingFee,
        int256 mintingFee
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (collectionCreatingFee >= 0) {
            nftCollectionConfig.collectionCreatingFee = CommonLib.abs(
                collectionCreatingFee
            );
        }
        if (mintingFee >= 0) {
            nftCollectionConfig.mintingFee = CommonLib.abs(mintingFee);
        }
    }

    function registerContract(bytes4 signature, address contractAddress)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        ContractRegistry[signature] = contractAddress;
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

    function getNFTCollectionConfig()
        external
        view
        override
        returns (uint256 collectionCreatingFee, uint256 mintingFee)
    {
        collectionCreatingFee = nftCollectionConfig.collectionCreatingFee;
        mintingFee = nftCollectionConfig.mintingFee;
    }

    function getNFTMarketConfig() external view override returns (uint256 zoom, uint256 marketFeeRate, address marketFeeWallet) {
        zoom = nftMarketConfig.ZOOM;
        marketFeeRate = nftMarketConfig.marketFeeRate;
        marketFeeWallet = nftMarketConfig.marketFeeWallet;
    }

    /** ==================== Standard interface function implementations ==================== */

    function _authorizeUpgrade(address)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
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
