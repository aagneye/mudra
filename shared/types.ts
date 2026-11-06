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
  creatorUsername: string | null; // World App username, shown instead of the address
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
  entrantUsername: string | null;
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

// ---- AI service (Aagneye) ----

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

// ---- World ID + relayer (Atul's /api/relay -> Abhimanyu's contracts) ----

/**
 * The result object from IDKit's handleVerify. The server forwards it unchanged to
 * POST https://developer.world.org/api/v4/verify/{RP_ID}, so we don't depend on its fields.
 * The nullifier from the verified result is what the contract stores.
 */
export type IdKitResult = Record<string, unknown>;

export type RelayRequest =
  | { kind: "registerPose"; result: IdKitResult; poseHash: Hex; parentId: number | null; metadataURI: string }
  | { kind: "submitEntry"; result: IdKitResult; challengeId: number; captureHash: Hex }
  | { kind: "vote"; result: IdKitResult; challengeId: number; entryId: number };
// The entrant / creator address comes from the walletAuth session on the server, never from the request body.

export type RelayError =
  | "NOT_SIGNED_IN"
  | "INVALID_PROOF"
  | "ALREADY_ENTERED"
  | "ALREADY_VOTED"
  | "SCORE_TOO_LOW"
  | "CHALLENGE_CLOSED"
  | "TOO_MANY_ENTRIES"
  | "UNKNOWN";

export type RelayResult =
  | { ok: true; txHash: Hex; id?: number }
  | { ok: false; error: RelayError; message: string };
