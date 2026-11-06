# Mudra

> Trends make stars rich. Mudra pays the person who started it.

A **World Mini App** for skill-based pose challenges. Creators post a signature pose, people recreate it with their phone camera, AI scores the match, verified humans vote, and a sponsor's USDC pool on World Chain pays the creator a royalty plus the top recreators.

## Start here

1. [PLAN.md](PLAN.md): the idea, problems and fixes, payout rules, timeline, demo
2. [docs/WORLD_MINI_APP.md](docs/WORLD_MINI_APP.md): how a World Mini App works and how Mudra uses it
3. Your own guide:

| Who | Owns | Folder | Branch | Guide |
|---|---|---|---|---|
| **Abhimanyu** | Smart contracts on World Chain | `contracts/` | `feature/contracts` | [docs/abhimanyu-contracts.md](docs/abhimanyu-contracts.md) |
| **Aagneye** | Pose AI + 0G | `ai/` | `feature/ai` | [docs/aagneye-ai.md](docs/aagneye-ai.md) |
| **Atul** | Mini App, World ID, relayer, demo | `app/` | `feature/app` | [docs/atul-app.md](docs/atul-app.md) |
| Everyone | Types, constants, contract interface, API, mocks | `shared/` | | [shared/API.md](shared/API.md) |

Change anything in `shared/` only after telling the other two.

## Branches

```
feature/*  ──PR──►  dev  ──►  master  ──►  main
```

- Never commit directly to `dev`, `master` or `main`.
- Start every piece of work from `dev`: `feature/contracts` (Abhimanyu), `feature/ai` (Aagneye), `feature/app` (Atul).
- Open a pull request from your feature branch into `dev`. Pull `dev` into your branch often to pick up `shared/` changes.
- When `dev` is working end to end, merge it into `master`, then `master` into `main`.
