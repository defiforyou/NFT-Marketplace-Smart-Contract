// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

library HubRoleLib {
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    /**
     * @dev OPERATOR_ROLE: those who have this role can assigne EVALUATOR_ROLE to others
     */
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /**
     * @dev PAUSER_ROLE: those who can pause the contract
     * by default this role is assigned to the contract creator
     *
     * NOTE: The main contract must inherit `Pausable` or this ROLE doesn't make sense
     */
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /**
     * @dev EVALUATOR_ROLE: Whitelisted Evaluators who can mint NFT token after evaluation has been accepted.
     */
    bytes32 public constant EVALUATOR_ROLE = keccak256("EVALUATOR_ROLE");

    bytes32 public constant REGISTRANT = keccak256("REGISTRANT");
}
