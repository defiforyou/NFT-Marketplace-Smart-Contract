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

    function divRoundV2(uint256 a) internal pure returns (uint256) {
        // kiem tra so du khi chia 10**13. Neu lon hon 5 *10**12 khi chia xong thi lam tron len(+1) roi nhan lai voi 10**13
        //con nho hon thi giu nguyen va nhan lai voi 10**13
        
        uint256 tmp = a / 10**8;
        uint256 tmpv2 = tmp * 10**8;
        uint256 tm;
        
        if (tmpv2 < a) {
            tm = a / 10**8 + 1;
        } else {
            tm = a / 10**8;
        }
        uint256 rouding = tm;
        return rouding;
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
