// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeCastUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

enum DurationType {
    HOUR,
    DAY
}

enum CollectionStandard {
    UNDEFINED,
    ERC721,
    ERC1155
    // TODO: Add enums for imported collections
}

library CommonLib {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;
    using SafeCastUpgradeable for uint256;
    using ERC165CheckerUpgradeable for address;

    /**
     * @dev safe transfer BNB or ERC20
     * @param  asset is address of the cryptocurrency to be transferred
     * @param  from is the address of the transferor
     * @param  to is the address of the receiver
     * @param  amount is transfer amount
     */

    function safeTransfer(
        address asset,
        address from,
        address to,
        uint256 amount
    ) internal {
        if (asset == address(0)) {
            require(from.balance >= amount, "0"); // balance
            // Handle BNB
            if (to == address(this)) {
                // Send to this contract
            } else if (from == address(this)) {
                // Send from this contract
                (bool success, ) = to.call{value: amount}("");
                require(success, "1"); //fail-trans-bnb
            } else {
                // Send from other address to another address
                require(false, "2"); //not-allow-transfer
            }
        } else {
            // Handle ERC20
            uint256 prebalance = IERC20Upgradeable(asset).balanceOf(to);
            require(
                IERC20Upgradeable(asset).balanceOf(from) >= amount,
                "3" //not-enough-balance
            );
            if (from == address(this)) {
                // transfer direct to to
                IERC20Upgradeable(asset).safeTransfer(to, amount);
            } else {
                require(
                    IERC20Upgradeable(asset).allowance(from, address(this)) >=
                        amount,
                    "4" //not-allowance
                );
                IERC20Upgradeable(asset).safeTransferFrom(from, to, amount);
            }
            require(
                IERC20Upgradeable(asset).balanceOf(to) - amount == prebalance,
                "5" //not-trans-enough
            );
        }
    }

    /**
     * @dev Calculate balance of wallet address
     * @param  _token is address of token
     * @param  from is address wallet
     */
    function calculateAmount(address _token, address from)
        internal
        view
        returns (uint256 _amount)
    {
        if (_token == address(0)) {
            // BNB
            _amount = from.balance;
        } else {
            // ERC20
            _amount = IERC20Upgradeable(_token).balanceOf(from);
        }
    }

    /**
     * @dev Calculate fee of system
     * @param  amount amount charged to the system
     * @param  feeRate is system fee rate
     */
    function calculateSystemFee(
        uint256 amount,
        uint256 feeRate,
        uint256 zoom
    ) internal pure returns (uint256 feeAmount) {
        feeAmount = (amount * feeRate) / (zoom * 100);
    }

    /**
     * @dev Return the absolute value of a signed integer
     * @param _input is any signed integer
     * @return an unsigned integer that is the absolute value of _input
     */
    function abs(int256 _input) internal pure returns (uint256) {
        return _input >= 0 ? uint256(_input) : uint256(_input * -1);
    }

    function getSecondsOfDuration(DurationType durationType, uint256 duration)
        internal
        pure
        returns (uint256 inSeconds)
    {
        if (durationType == DurationType.HOUR) {
            // inSeconds = duration * 3600;
            inSeconds = duration * 5; // For testing 1 hour = 5 seconds
        } else if (durationType == DurationType.DAY) {
            // inSeconds = duration * 24 * 3600;
            inSeconds = duration * 120; // For testing 1 day = 120 seconds
        }
    }

    function verifyTokenInfo(
        address collectionAddress,
        uint256 tokenId,
        uint256 numberOfCopies,
        address owner
    ) internal view returns (CollectionStandard _standard) {
        // Check if collection address differs from the zero address
        require(
            collectionAddress != address(0),
            "Collection address must not be the zero address"
        );

        // Check for supported NFT standards
        if (collectionAddress.supportsInterface(type(IERC721).interfaceId)) {
            _standard = CollectionStandard.ERC721;

            require(numberOfCopies == 1, "ERC-721: Amount not supported");
        } else if (
            collectionAddress.supportsInterface(type(IERC1155).interfaceId)
        ) {
            _standard = CollectionStandard.ERC1155;

            // Check for seller's balance
            require(
                IERC1155(collectionAddress).balanceOf(owner, tokenId) >=
                    numberOfCopies,
                "ERC-1155: Insufficient balance"
            );
        } else {
            _standard = CollectionStandard.UNDEFINED;
        }

        require(
            _standard != CollectionStandard.UNDEFINED,
            "ERC-721 or ERC-1155 standard is required"
        );
    }
}