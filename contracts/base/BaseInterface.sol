// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

interface BaseInterface is IERC165Upgradeable {
    function signature() external view returns (bytes4);
}