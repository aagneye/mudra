// Numbers all three parts must agree on. Contracts mirror these as constants.

/** Entries below this AI score don't count for royalties and can't be voted on. */
export const MIN_VALID_SCORE = 60;

/** A new pose at or above this similarity to an existing pose is a remix. */
export const REMIX_THRESHOLD = 90;

/** Final rank = AI_WEIGHT * aiScore + VOTE_WEIGHT * voteShare (both 0..100). */
export const AI_WEIGHT = 0.4;
export const VOTE_WEIGHT = 0.6;

/** Split of the pool left after the creator royalty, for ranks 1, 2, 3 (basis points). */
export const WINNER_SPLIT_BPS = [5000, 3000, 2000] as const;

/** Keeps finalize() cheap enough to loop over every entry. */
export const MAX_ENTRIES_PER_CHALLENGE = 200;

export const USDC_DECIMALS = 6;

/** World ID actions. The nullifier is unique per human per action. */
export const worldIdAction = {
  registerPose: "register-pose",
  enter: (challengeId: number) => `enter-${challengeId}`,
  vote: (challengeId: number) => `vote-${challengeId}`,
};

/** If 0G hasn't answered by then, /score returns the local score. */
export const ZERO_G_TIMEOUT_MS = 5000;

/** We build on World Chain Sepolia. Mainnet is 480. */
export const worldChainSepolia = {
  chainId: 4801,
  rpcUrl: "https://worldchain-sepolia.g.alchemy.com/public",
  explorer: "https://worldchain-sepolia.explorer.alchemy.com",
  usdc: "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88",
} as const;
