// Fake implementations so each person can build before the others are done.
// Delete the imports of this file once the real thing is connected (hours 18-26).

import type { Challenge, CheckOriginalResult, Entry, Pose, RelayRequest, RelayResult, ScoreResult } from "./types";

const fakeHash = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as const;

export async function mockScore(): Promise<ScoreResult> {
  const score = 70 + Math.floor(Math.random() * 26);
  return {
    score,
    localScore: score,
    feedback: "Great match! Raise your left arm a little higher.",
    flagged: false,
    responseHash: fakeHash(score),
    source: "local-fallback",
  };
}

export async function mockCheckOriginal(): Promise<CheckOriginalResult> {
  return { isRemix: false, parentId: null, similarity: 42 };
}

const usedNullifiers = new Set<string>();

export async function mockRelay(req: RelayRequest): Promise<RelayResult> {
  const key = `${req.kind}:${"challengeId" in req ? req.challengeId : ""}:${String(req.result.nullifier ?? "mock-human")}`;
  if (req.kind !== "registerPose" && usedNullifiers.has(key)) {
    return req.kind === "vote"
      ? { ok: false, error: "ALREADY_VOTED", message: "This human already voted in this challenge." }
      : { ok: false, error: "ALREADY_ENTERED", message: "This human already entered this challenge." };
  }
  usedNullifiers.add(key);
  return { ok: true, txHash: fakeHash(usedNullifiers.size), id: usedNullifiers.size };
}

export const mockPoses: Pose[] = [
  {
    id: 1,
    creator: "0x1111111111111111111111111111111111111111",
    creatorUsername: "abhimanyu",
    parentId: null,
    createdAt: 1_762_400_000,
    poseHash: fakeHash(1),
    thumbnailUrl: "/mock/pose-1.jpg",
    keypoints: [],
  },
];

export const mockChallenges: Challenge[] = [
  {
    id: 1,
    poseId: 1,
    sponsor: "0x2222222222222222222222222222222222222222",
    pool: "100000000", // 100 USDC
    royaltyPerEntry: "2000000", // 2 USDC
    creatorCapBps: 3000,
    deadline: 1_762_500_000,
    finalized: false,
  },
];

export const mockEntries: Entry[] = [
  { id: 1, challengeId: 1, entrant: "0x3333333333333333333333333333333333333333", entrantUsername: "aagneye", captureHash: fakeHash(11), score: 87, votes: 3, thumbnailUrl: "/mock/entry-1.jpg", flagged: false },
  { id: 2, challengeId: 1, entrant: "0x4444444444444444444444444444444444444444", entrantUsername: "atul", captureHash: fakeHash(12), score: 74, votes: 1, thumbnailUrl: "/mock/entry-2.jpg", flagged: false },
  { id: 3, challengeId: 1, entrant: "0x5555555555555555555555555555555555555555", entrantUsername: "judge1", captureHash: fakeHash(13), score: 52, votes: 0, thumbnailUrl: "/mock/entry-3.jpg", flagged: false },
];
