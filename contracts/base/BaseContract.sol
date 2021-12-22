// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "../libs/CommonLib.sol";
import "../hub/HubLib.sol";
import "../hub/HubInterface.sol";
import "./BaseInterface.sol";

abstract contract BaseContract is
    Initializable,
    UUPSUpgradeable,
    PausableUpgradeable,
    ERC165Upgradeable,
    ReentrancyGuardUpgradeable,
    BaseInterface
{
    address public contractHub;

    function __BaseContract_init(address _hub) internal initializer {
        __BaseContract_init_unchained();

        contractHub = _hub;
    }

    function __BaseContract_init_unchained() internal initializer {
        __UUPSUpgradeable_init();
        __Pausable_init();
    }

    modifier onlyAdmin() {
        _onlyRole(HubRoles.DEFAULT_ADMIN_ROLE);
        _;
    }

    modifier onlyOperator() {
        _onlyRole(HubRoles.OPERATOR_ROLE);
        _;
    }

    modifier onlyPauser() {
        _onlyRole(HubRoles.PAUSER_ROLE);
        _;
    }

    modifier whenContractNotPaused() {
        _whenNotPaused();
        _;
    }

    function _whenNotPaused() private view {
        require(!paused(), "Pausable: paused");
    }

    function _onlyRole(bytes32 role) internal view {
        _checkRole(role, _msgSender());
    }

    /**
     * @dev Revert with a standard message if msg.sender is missing `role`.
     *
     * The format of the revert reason is given by the following regular expression:
     *
     *  /^AccessControl: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/
     */
    function _checkRole(bytes32 role, address account) private view {
        if (!IAccessControlUpgradeable(contractHub).hasRole(role, account)) {
            revert(
                string(
                    abi.encodePacked(
                        "AccessControl: account ",
                        StringsUpgradeable.toHexString(uint160(account), 20),
                        " is missing role ",
                        StringsUpgradeable.toHexString(uint256(role), 32)
                    )
                )
            );
        }
    }

    function pause() external onlyPauser {
        _pause();
    }

    function unPause() external onlyPauser {
        _unpause();
    }

    function setContractHub(address _hub) external override onlyAdmin {
        contractHub = _hub;
    }

    function _authorizeUpgrade(address) internal override onlyAdmin {}
}
