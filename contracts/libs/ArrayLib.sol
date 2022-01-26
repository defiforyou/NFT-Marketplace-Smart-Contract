// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Collection of functions related to the array type
 */
library ArrayLib {

    function checkExistsInArray(address[] memory _arr, address _address)
        internal
        pure
        returns (bool isExist, uint256 index)
    {
        for (uint256 i = 0; i < _arr.length; i++) {
            if (_arr[i] == _address) {
                isExist = true;
                index = i;
            }
        }
    }

    function divRound(uint256 _num) internal pure returns (uint256 result) {
        result = _num/10**13;
        result = (result*10**13);
    }

    function checkExistsInArray(uint256[] memory _arr, uint256 _uint)
        internal
        pure
        returns (bool isExist, uint256 index)
    {
        for (uint256 i = 0; i < _arr.length; i++) {
            if (_arr[i] == _uint) {
                isExist = true;
                index = i;
            }
        }
    }

    function removeOutOfArray(address[] storage _arr, uint256 _index)
        internal
        returns (address[] storage)
    {
        _arr[_index] = _arr[_arr.length - 1];
        _arr.pop();
        return _arr;
    }

    function removeOutOfArray(uint256[] storage _arr, uint256 _index)
        internal
        returns (uint256[] storage)
    {
        _arr[_index] = _arr[_arr.length - 1];
        _arr.pop();
        return _arr;
    }

    function removeOutOfArrayUnchangedPosition(
        uint256[] storage _arr,
        uint256 _index
    ) internal returns (uint256[] storage) {
        require(_index <= _arr.length);
        for (uint256 i = _index; i < _arr.length - 1; i++) {
            _arr[i] = _arr[i + 1];
        }
        _arr.pop();
        return _arr;
    }

    function removeOutOfArrayUnchangedPosition(
        address[] storage _arr,
        uint256 _index
    ) internal returns (address[] storage) {
        require(_index <= _arr.length);
        for (uint256 i = _index; i < _arr.length - 1; i++) {
            _arr[i] = _arr[i + 1];
        }
        _arr.pop();
        return _arr;
    }
}
