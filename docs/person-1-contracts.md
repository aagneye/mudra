# contracts/ (Person 1)

Implements [`shared/IMudra.sol`](../shared/IMudra.sol) on Arc testnet with Foundry.

## Setup

```bash
cd contracts
forge init --no-git --force .
forge install OpenZeppelin/openzeppelin-contracts --no-git
```

## Files to create

- `src/PoseRegistry.sol`
- `src/ChallengePool.sol` (payout math in [PLAN.md](../PLAN.md#4-payout-math-contract-logic))
- `src/MockUSDC.sol` (6 decimals, for local tests)
- `test/ChallengePool.t.sol`
- `script/Deploy.s.sol` (deploys, seeds one demo challenge, writes `shared/addresses.json`)

## Checklist

- [ ] Nullifier used once per challenge for entries, once per challenge for votes
- [ ] Votes only on entries with score >= 60 and not flagged
- [ ] `finalize` only after the deadline, only once
- [ ] Creator payout = min(validEntries × royaltyPerEntry, pool × capBps / 10000)
- [ ] Top 3 by 0.4 × score + 0.6 × voteShare get 50/30/20; with fewer than 3 valid entries, leftover goes to rank 1
- [ ] Test: a double vote reverts with `AlreadyVoted`
- [ ] Deployed on Arc testnet, ABIs copied to `shared/abi/`, addresses in `shared/addresses.json`
