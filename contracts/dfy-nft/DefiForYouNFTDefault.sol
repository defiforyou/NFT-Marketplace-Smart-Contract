// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "./DFY721Base.sol";

/**
* TODO: Make a common interface or contract for both Default collection and User-created collection
* DONE
 */

/** Default NFT Collection - must be deployed separately from user-created collection (deployed using Factory) */
contract DefiForYouNFT is DFY721Base {
    
    constructor(
        string memory name,
        string memory symbol,
        address payable owner,
        uint256 royaltyRate,
        string memory collectionCID,
        address hub
    ) DFY721Base(name, symbol, owner, royaltyRate, collectionCID, hub) {}
}
