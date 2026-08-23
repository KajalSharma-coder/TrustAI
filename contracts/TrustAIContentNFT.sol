// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TrustAIContentNFT is ERC721 {
    uint256 private _nextTokenId;

    mapping(uint256 => bytes32) private _contentHashes;
    mapping(uint256 => uint256) private _timestamps;
    mapping(uint256 => address) private _creators;

    event ContentTokenized(
        uint256 indexed tokenId,
        bytes32 indexed contentHash,
        address indexed creator,
        uint256 timestamp
    );

    constructor() ERC721("TrustAI Content NFT", "TAINFT") {}

    function mintContent(bytes32 newContentHash) external returns (uint256 tokenId) {
        require(newContentHash != bytes32(0), "Invalid content hash");

        tokenId = ++_nextTokenId;
        uint256 mintedAt = block.timestamp;

        _contentHashes[tokenId] = newContentHash;
        _timestamps[tokenId] = mintedAt;
        _creators[tokenId] = msg.sender;

        _safeMint(msg.sender, tokenId);

        emit ContentTokenized(tokenId, newContentHash, msg.sender, mintedAt);
    }

    function contentHash(uint256 tokenId) external view returns (bytes32) {
        _requireOwned(tokenId);
        return _contentHashes[tokenId];
    }

    function timestamp(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return _timestamps[tokenId];
    }

    function creator(uint256 tokenId) external view returns (address) {
        _requireOwned(tokenId);
        return _creators[tokenId];
    }
}
