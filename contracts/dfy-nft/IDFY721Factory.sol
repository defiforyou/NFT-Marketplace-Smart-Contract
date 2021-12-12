// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "../base/BaseInterface.sol";

interface IDFY721Factory is BaseInterface {
    /** Enums */
    enum CollectionStatus {
        OPEN
    }

    /** Events */
    event CollectionCreated(
        address collection,
        address creator,
        string name,
        string symbol,
        uint256 royaltyRate,
        string collectionCID,
        CollectionStatus status
    );

    /** Functions */
    function createCollection(
        string memory _name,
        string memory _symbol,
        uint256 _royaltyRate,
        string memory _collectionCID
    ) external returns (address newCollection);
}
