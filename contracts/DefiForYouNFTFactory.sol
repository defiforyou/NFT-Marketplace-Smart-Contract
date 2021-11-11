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
    /** ==================== All state variables ==================== */
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    address public feeWallet;
    uint256 public collectionCreatingFee;
    mapping(address => bool) public whitelistedFeeTokens;

    mapping(address => DefiForYouNFT[]) public collectionsByOwner;

    // TODO: New state variables must go below this line -----------------------------

    /** ==================== Contract initializing & configuration ==================== */
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

    function setFeeWallet(address wallet)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        feeWallet = wallet;
    }

    /** ==================== NFT collection operation ==================== */
    enum CollectionStatus {
        OPEN
    }

    event CollectionCreated(
        address collection,
        address creator,
        string name,
        string symbol,
        uint256 royaltyRate,
        string collectionCID,
        CollectionStatus status
    );

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
    ) external returns (address newCollection) {
        DefiForYouNFT dfyNFT = new DefiForYouNFT(
            _name,
            _symbol,
            payable(msg.sender),
            _royaltyRate,
            _collectionCID
        );

        collectionsByOwner[msg.sender].push(dfyNFT);

        newCollection = address(dfyNFT);

        if (collectionCreatingFee > 0) {
            // TODO: transfer minting fee in crypto to fee wallet
        }

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
