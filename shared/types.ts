// Shared data shapes for contracts, AI and app.
// Change this file only after telling the other two people.

/** One MediaPipe Pose landmark. x and y are 0..1 relative to the image. */
export type Keypoint = { x: number; y: number; z: number; visibility: number };

/** 33 MediaPipe Pose landmarks, in MediaPipe order. */
export type Keypoints = Keypoint[];

/** USDC amount in base units (6 decimals), as a string so it survives JSON. */
export type UsdcAmount = string;

export type Address = `0x${string}`;
export type Hex = `0x${string}`;

export type Pose = {
  id: number;
  creator: Address;
  parentId: number | null; // set when the pose is a remix of an earlier one
  createdAt: number; // unix seconds
  poseHash: Hex; // keccak256 of the normalized keypoints JSON
  thumbnailUrl: string;
  keypoints: Keypoints;
};

export type Challenge = {
  id: number;
  poseId: number;
  sponsor: Address;
  pool: UsdcAmount;
  royaltyPerEntry: UsdcAmount;
  creatorCapBps: number; // 3000 = 30% of the pool
  deadline: number; // unix seconds
  finalized: boolean;
};

export type Entry = {
  id: number;
  challengeId: number;
  entrant: Address;
  captureHash: Hex;
  score: number | null; // 0..100, null until the AI has scored it
  votes: number;
  thumbnailUrl: string;
  flagged: boolean;
};

export type Payout = {
  challengeId: number;
  recipient: Address;
  amount: UsdcAmount;
  kind: "creator" | "winner";
  rank?: 1 | 2 | 3;
  txHash: Hex;
};

// ---- AI service (Person 2) ----

export type ScoreRequest = {
  originalImage: string; // base64 JPEG (data URL)
  originalKeypoints: Keypoints;
  attemptImage: string;
  attemptKeypoints: Keypoints;
};

export type ScoreResult = {
  score: number; // 0..100
  localScore: number; // joint-angle score before the 0G model
  feedback: string; // e.g. "Raise your left arm higher"
  flagged: boolean; // moderation
  responseHash: Hex; // keccak256 of the raw 0G response, posted onchain
  source: "0g" | "local-fallback";
};

export type CheckOriginalRequest = { keypoints: Keypoints };

export type CheckOriginalResult = {
  isRemix: boolean;
  parentId: number | null;
  similarity: number; // 0..100 against the closest existing pose
};

// ---- World ID + relayer (Person 3 -> Person 1) ----

/** Proof fields as returned by IDKit. */
export type WorldIdProof = {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: string;
};

export type RelayRequest =
  | { kind: "registerPose"; proof: WorldIdProof; poseHash: Hex; parentId: number | null; metadataURI: string }
  | { kind: "submitEntry"; proof: WorldIdProof; challengeId: number; entrant: Address; captureHash: Hex }
  | { kind: "vote"; proof: WorldIdProof; challengeId: number; entryId: number };

export type RelayResult =
  | { ok: true; txHash: Hex; id?: number }
  | { ok: false; error: "ALREADY_VOTED" | "ALREADY_ENTERED" | "INVALID_PROOF" | "SCORE_TOO_LOW" | "CHALLENGE_CLOSED" | "UNKNOWN"; message: string };
