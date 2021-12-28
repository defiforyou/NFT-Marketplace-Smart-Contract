// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IDFY721 is IERC721 {
    /** Events */
    event NFTCreated(
        address owner,
        uint256 tokenID,
        uint256 royaltyRate,
        string tokenCID
    );

    event CollectionRoyaltyRateChanged(
        uint256 previousRoyaltyRate,
        uint256 newRoyaltyRate
    );

    /** Functions */
    function safeMint(
        address owner,
        uint256 royaltyRate,
        string memory tokenCID
    ) external;

    function tokensOfOwner(address _owner)
        external
        view
        returns (uint256[] memory);

    function setCollectionDefaultRoyaltyRate(uint256 newRoyaltyRate)
        external;

    function originalCreator() external view returns (address);

    function royaltyRateByToken(uint256 tokenId) external view returns (uint256);
}
