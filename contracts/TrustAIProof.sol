// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TrustAIProof {
    struct Proof {
        uint256 timestamp;
        address owner;
        bool exists;
    }

    mapping(bytes32 => Proof) public proofs;

    event ProofStored(
        bytes32 indexed contentHash,
        address indexed owner,
        uint256 timestamp
    );

    function storeProof(bytes32 contentHash) external {
        require(!proofs[contentHash].exists, "Proof already exists");

        uint256 timestamp = block.timestamp;
        proofs[contentHash] = Proof({
            timestamp: timestamp,
            owner: msg.sender,
            exists: true
        });

        emit ProofStored(contentHash, msg.sender, timestamp);
    }

    function verifyProof(bytes32 contentHash) external view returns (bool) {
        return proofs[contentHash].exists;
    }
}
