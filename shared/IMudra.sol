// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// The onchain interface everyone builds against. Person 1 implements it in contracts/.
// The app reads the events to show the onchain trail, so keep event shapes stable.

interface IPoseRegistry {
    struct Pose {
        address creator;
        uint64 createdAt;
        uint256 parentId; // 0 = original, otherwise the id of the pose it remixes
        bytes32 poseHash;
        string metadataURI; // JSON with thumbnail URL and keypoints
    }

    event PoseRegistered(uint256 indexed poseId, address indexed creator, uint256 indexed parentId, bytes32 poseHash);

    /// Relayer only, after the backend verified a World ID proof for "register-pose".
    function registerPose(address creator, bytes32 poseHash, uint256 parentId, string calldata metadataURI)
        external
        returns (uint256 poseId);

    function getPose(uint256 poseId) external view returns (Pose memory);
}

interface IChallengePool {
    struct Challenge {
        uint256 poseId;
        address sponsor;
        uint256 pool; // USDC, 6 decimals
        uint256 royaltyPerEntry;
        uint16 creatorCapBps;
        uint64 deadline;
        bool finalized;
        uint256 entryCount;
    }

    struct Entry {
        uint256 challengeId;
        address entrant;
        bytes32 captureHash;
        uint8 score; // 0..100
        bool scored;
        bool flagged;
        uint256 votes;
    }

    error AlreadyEntered();
    error AlreadyVoted();
    error ScoreTooLow();
    error ChallengeClosed();
    error ChallengeStillOpen();
    error NotOracle();
    error NotRelayer();

    event ChallengeCreated(uint256 indexed challengeId, uint256 indexed poseId, address indexed sponsor, uint256 pool, uint64 deadline);
    event EntrySubmitted(uint256 indexed challengeId, uint256 indexed entryId, address indexed entrant, bytes32 captureHash);
    event EntryScored(uint256 indexed entryId, uint8 score, bool flagged, bytes32 responseHash);
    event Voted(uint256 indexed challengeId, uint256 indexed entryId, uint256 nullifierHash);
    event PaidOut(uint256 indexed challengeId, address indexed recipient, uint256 amount, uint8 rank); // rank 0 = creator royalty
    event Finalized(uint256 indexed challengeId);

    /// Sponsor calls this after approving `pool` USDC to this contract.
    function createChallenge(uint256 poseId, uint256 pool, uint256 royaltyPerEntry, uint16 creatorCapBps, uint64 deadline)
        external
        returns (uint256 challengeId);

    /// Relayer only. Reverts AlreadyEntered if the nullifier was used for this challenge.
    function submitEntry(uint256 challengeId, address entrant, uint256 nullifierHash, bytes32 captureHash)
        external
        returns (uint256 entryId);

    /// Oracle (AI backend) only.
    function postScore(uint256 entryId, uint8 score, bool flagged, bytes32 responseHash) external;

    /// Relayer only. Reverts AlreadyVoted on a reused nullifier, ScoreTooLow under MIN_VALID_SCORE.
    function vote(uint256 challengeId, uint256 entryId, uint256 nullifierHash) external;

    /// Anyone, after the deadline. Pays the creator royalty and the top 3.
    function finalize(uint256 challengeId) external;

    function getChallenge(uint256 challengeId) external view returns (Challenge memory);
    function getEntry(uint256 entryId) external view returns (Entry memory);
}
