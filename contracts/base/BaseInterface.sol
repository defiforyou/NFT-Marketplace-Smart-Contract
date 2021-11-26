// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";

interface BaseInterface is IERC165Upgradeable {
    function signature() external pure returns (bytes4);

    function setContractHub(address _hub) external;
}