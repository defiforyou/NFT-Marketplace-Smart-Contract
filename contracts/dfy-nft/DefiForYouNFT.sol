// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "./DFY721Base.sol";

contract DefiForYouNFT is DFY721Base {
    using Address for address;

    // Define Minter role
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    address public factory;

    constructor(
        string memory name,
        string memory symbol,
        address payable owner,
        uint256 royaltyRate,
        string memory collectionCID,
        address hub
    ) DFY721Base(name, symbol, owner, royaltyRate, collectionCID, hub) {
        _setupRole(MINTER_ROLE, owner);

        if (msg.sender.isContract()) {
            factory = msg.sender;
        }
    }

    function safeMint(
        address owner,
        uint256 royaltyRate,
        string memory tokenCID
    ) public override onlyRole(MINTER_ROLE) {
        super.safeMint(owner, royaltyRate, tokenCID);
    }
}
