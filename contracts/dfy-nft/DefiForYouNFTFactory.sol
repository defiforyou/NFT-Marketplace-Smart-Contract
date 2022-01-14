// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "../base/BaseContract.sol";
import "../libs/CommonLib.sol";
import "./IDFY721Factory.sol";
import "./DefiForYouNFT.sol";

contract DefiForYouNFTFactory is BaseContract, IDFY721Factory {
    /** ==================== All state variables ==================== */
    mapping(address => DefiForYouNFT[]) public collectionsByOwner;

    // TODO: New state variables must go below this line -----------------------------

    /** ==================== Contract initializing & configuration ==================== */
    function initialize(address _hub) public initializer {
        __BaseContract_init(_hub);
    }

    /** ==================== Standard interface function implementations ==================== */

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC165Upgradeable, IERC165Upgradeable)
        returns (bool)
    {
        return
            interfaceId == type(IDFY721Factory).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function signature() external pure override returns (bytes4) {
        return type(IDFY721Factory).interfaceId;
    }

    /** ==================== NFT collection operation ==================== */

    /**
     * @dev create new collection using DefiForYouNFT template
     * @param _name is new collection's name
     * @param _symbol is new collection's symbol
     * @param _royaltyRate is new collection's default royalty rate
     * @param _collectionCID is new collection's metadata CID
     */
    function createCollection(
        string memory _name,
        string memory _symbol,
        uint256 _royaltyRate,
        string memory _collectionCID
    ) external override returns (address newCollection) {
        DefiForYouNFT dfyNFT = new DefiForYouNFT(
            _name,
            _symbol,
            payable(msg.sender),
            _royaltyRate,
            _collectionCID,
            contractHub
        );

        collectionsByOwner[msg.sender].push(dfyNFT);

        newCollection = address(dfyNFT);

        (uint256 collectionCreatingFee, ) = HubInterface(contractHub)
            .getNFTCollectionConfig();

        if (collectionCreatingFee > 0) {
            // Get fee wallet and fee token address
            (address feeWallet, address feeToken) = HubInterface(contractHub)
                .getSystemConfig();

            // Transfer collection creating fee to fee wallet
            CommonLib.safeTransfer(
                feeToken,
                _msgSender(),
                feeWallet,
                collectionCreatingFee
            );
        }

        HubInterface(contractHub).setWhitelistCollateral_NFT(
            address(newCollection),
            1
        );

        emit CollectionCreated(
            newCollection,
            msg.sender,
            _name,
            _symbol,
            _royaltyRate,
            _collectionCID,
            CollectionStatus.OPEN
        );
    }
}
