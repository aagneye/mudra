# Abhimanyu: smart contracts

**Folder:** `contracts/` · **Branch:** `feature/contracts` · **Stack:** Foundry, Solidity 0.8.24, OpenZeppelin, World Chain Sepolia (chain `4801`)

You own the onchain part of Mudra: who started a pose, the USDC prize pools, one entry and one vote per human, and the automatic payouts. Read [PLAN.md](../PLAN.md) sections 4-5 and the interface in [shared/IMudra.sol](../shared/IMudra.sol) first.

## What you build

### `src/PoseRegistry.sol`
- `registerPose(creator, poseHash, parentId, metadataURI)`: only the relayer can call it (after it checked World ID). Stores creator, timestamp, parent (0 = original) and the metadata URI. Emits `PoseRegistered`.
- `getPose(poseId)`.

### `src/ChallengePool.sol`
- **Roles set once in the constructor:** `usdc`, `registry`, `relayer`, `oracle`. Not upgradable, no owner, **no function that lets anyone withdraw a sponsor's deposit** (World's smart contract rules).
- `createChallenge(poseId, pool, royaltyPerEntry, creatorCapBps, deadline)`: the sponsor calls it after `approve`. Pulls USDC with `safeTransferFrom`. Checks the pose exists, the deadline is in the future and `creatorCapBps <= 10000`.
- `submitEntry(challengeId, entrant, nullifierHash, captureHash)`: relayer only. Reverts `AlreadyEntered` if this nullifier already entered this challenge, `ChallengeClosed` after the deadline, and `TooManyEntries` above `MAX_ENTRIES` (200).
- `postScore(entryId, score, flagged, responseHash)`: oracle only. Score 0-100. Can be posted once per entry.
- `vote(challengeId, entryId, nullifierHash)`: relayer only. Reverts `AlreadyVoted` on a reused nullifier for this challenge, `ScoreTooLow` if the entry isn't scored, is under 60 or is flagged, and `ChallengeClosed` after the deadline.
- `finalize(challengeId)`: anyone, after the deadline, once. Uses the payout rules below.
- `reclaim(challengeId)`: only the sponsor, only after finalize, only if there were no valid entries. Returns their pool.

### Payout rules
```
valid          = scored && score >= 60 && !flagged
creatorPayout  = min(validCount × royaltyPerEntry, pool × creatorCapBps / 10000)
rest           = pool − creatorPayout
voteShare      = maxVotes == 0 ? 0 : votes × 100 / maxVotes
finalScore     = 40 × score + 60 × voteShare        (scaled by 100, integers only)
top 3 by finalScore share rest 50% / 30% / 20%
fewer than 3 valid → unused shares go to rank 1
ties → the earlier entry wins
rounding dust → rank 1
```
Looping over at most 200 entries in `finalize` is fine for a hackathon. Emit `PaidOut` for every transfer (rank 0 = creator).

### Also
- `src/MockUSDC.sol`: 6 decimals, public `mint`, for local tests only.
- `script/Deploy.s.sol`: deploys both contracts with the relayer and oracle addresses from env, creates one demo pose and one demo challenge, and prints the addresses.
- After deploying: copy the ABIs to `shared/abi/` (`PoseRegistry.json`, `ChallengePool.json`) and fill in `shared/addresses.json`. Give Atul the contract addresses to allowlist in the Developer Portal.

## Setup

```bash
git checkout feature/contracts && git pull origin dev
cd contracts
forge init --no-git --force .
forge install OpenZeppelin/openzeppelin-contracts --no-git
```

`.env` (never commit it):
```bash
RPC_URL=https://worldchain-sepolia.g.alchemy.com/public
DEPLOYER_PRIVATE_KEY=0x...
RELAYER_ADDRESS=0x...      # Atul gives you this
ORACLE_ADDRESS=0x...       # Aagneye gives you this
USDC_ADDRESS=0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88   # USDC on World Chain Sepolia
```

Deploy:
```bash
forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --broadcast
```

Testnet funds: [l2faucet.com/world](https://www.l2faucet.com/world). Explorer: worldchain-sepolia.explorer.alchemy.com.

## Tests (`test/ChallengePool.t.sol`), aim for 90%+ coverage

- [ ] Full flow: create → 4 entries → scores → votes → finalize pays the exact amounts
- [ ] Second entry with the same nullifier reverts `AlreadyEntered`
- [ ] Second vote with the same nullifier reverts `AlreadyVoted` (the demo moment)
- [ ] The same nullifier can vote in two different challenges
- [ ] Vote on an entry under 60, flagged or unscored reverts `ScoreTooLow`
- [ ] Only the relayer / oracle can call their functions
- [ ] Creator cap applies when there are many entries
- [ ] 1 and 2 valid entries: leftover goes to rank 1
- [ ] 0 valid entries: sponsor can reclaim, nobody else can
- [ ] `finalize` before the deadline and twice both revert
- [ ] `forge coverage` report

## Hand-offs

| To | What | When |
|---|---|---|
| Everyone | Changes to `shared/IMudra.sol` (tell the others first) | Hour 2 |
| Atul + Aagneye | Local Anvil deployment + ABIs | Hour 10 |
| Atul | Sepolia addresses for the Developer Portal allowlist | Hour 18 |
| Atul | Explorer links for the results screen | Hour 26 |

## Done when
All tests pass, contracts are deployed on World Chain Sepolia, `shared/addresses.json` and `shared/abi/` are filled in, and the demo challenge is seeded.
