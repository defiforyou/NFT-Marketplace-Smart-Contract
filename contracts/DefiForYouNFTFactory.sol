// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./DefiForYouNFT.sol";

contract DefiForYouNFTFactory is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    mapping(address => mapping(uint256 => DefiForYouNFT))
        public collectionsByOwner;
    mapping(address => uint256) public numberOfCollectionByOwner;
    mapping(address => bool) public whitelistedFeeTokens;

    uint256 public collectionCreatingFee;
    address public feeWallet;

    function initialize() public initializer {
        __UUPSUpgradeable_init();
        __Pausable_init();

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);
    }

    modifier whenContractNotPaused() {
        _whenNotPaused();
        _;
    }

    function _whenNotPaused() private view {
        require(!paused(), "Pausable: paused");
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unPause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function setCollectionCreatingFee(uint256 _fee)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        collectionCreatingFee = _fee;
    }

    function setWhitelistedFeeToken(address _feeToken, bool whitelistStatus)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        whitelistedFeeTokens[_feeToken] = whitelistStatus;
    }

    /** ==================== NFT collection operation ==================== */
    enum CollectionStatus {
        OPEN
    }

    event CollectionCreated(
        address creator,
        string name,
        string symbol,
        uint256 royaltyRate,
        string collectionCID,
        CollectionStatus status
    );

    function createCollection(
        string memory _name,
        string memory _symbol,
        uint256 _royaltyRate,
        string memory _cid
    ) external onlyRole(OPERATOR_ROLE) returns (address newCollection) {
        uint256 totalCollectionByOwner = numberOfCollectionByOwner[msg.sender];
        collectionsByOwner[msg.sender][
            totalCollectionByOwner
        ] = new DefiForYouNFT(
            _name,
            _symbol,
            payable(msg.sender),
            _royaltyRate,
            _cid
        );

        ++numberOfCollectionByOwner[msg.sender];

        if (collectionCreatingFee > 0) {
            // TODO: transfer minting fee in crypto to fee wallet
        }

        newCollection = address(
            collectionsByOwner[msg.sender][totalCollectionByOwner]
        );

        emit CollectionCreated(
            msg.sender,
            _name,
            _symbol,
            _royaltyRate,
            _cid,
            CollectionStatus.OPEN
        );
    }

    /** ==================== Standard interface function implementations ==================== */

    function _authorizeUpgrade(address)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
