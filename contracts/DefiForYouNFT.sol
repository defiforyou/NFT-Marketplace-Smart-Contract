// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract DefiForYouNFT is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    ERC721Burnable,
    AccessControl
{
    using Counters for Counters.Counter;

    // Define Minter role
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    string public constant CollectionURI =
        "https://defiforyou.mypinata.cloud/ipfs/";
    uint256 public constant ZOOM = 10**5;

    Counters.Counter private _tokenIdCounter;
    address public factory;
    address payable public originalCreator;
    uint256 public defaultRoyaltyRate;
    string public collectionCID;
    mapping(uint256 => uint256) public royaltyRateByToken;

    event NFTCreated(
        address owner,
        uint256 tokenID,
        string tokenCID
    );

    constructor( 
        string memory _name,
        string memory _symbol,
        address payable _owner,
        uint256 _royaltyRate,
        string memory _collectionCID
    ) ERC721(_name, _symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
        _setupRole(MINTER_ROLE, _owner);

        originalCreator = _owner;
        defaultRoyaltyRate = _royaltyRate;
        collectionCID = _collectionCID;

        factory = msg.sender;
    }

    function safeMint(address _owner, string memory _tokenCID)
        public
        onlyRole(MINTER_ROLE)
    {
        uint256 tokenID = _tokenIdCounter.current();
        _safeMint(_to, tokenID);

        _setTokenURI(tokenID, _cid);
        
        _tokenIdCounter.increment();

        emit NFTCreated(_to, tokenID, _cid);
    }

    function tokensOfOwner(address _owner)
        external
        view
        returns (uint256[] memory)
    {
        // get the number of token being hold by _owner
        uint256 tokenCount = balanceOf(_owner);

        if (tokenCount == 0) {
            // If _owner has no balance return an empty array
            return new uint256[](0);
        } else {
            // Query _owner's tokens by index and add them to the token array
            uint256[] memory tokenList = new uint256[](tokenCount);
            for (uint256 i = 0; i < tokenCount; i++) {
                tokenList[i] = tokenOfOwnerByIndex(_owner, i);
            }

            return tokenList;
        }
    }

    function contractURI() public view returns (string memory) {
        return string(abi.encodePacked(_baseURI(), collectionCID));
    }

    function _baseURI() internal pure override returns (string memory) {
        return CollectionURI;
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
