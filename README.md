# Mudra

> Trends make stars rich. Mudra pays the person who started it.

Read [PLAN.md](PLAN.md) first. The shared interfaces are in [shared/](shared/API.md).

| Folder | Owner | What |
|---|---|---|
| `contracts/` | [Person 1](docs/person-1-contracts.md) | Pose registry and USDC challenge pools on Arc |
| `ai/` | [Person 2](docs/person-2-ai.md) | MediaPipe pose matching and 0G scoring API |
| `app/` | [Person 3](docs/person-3-app.md) | Next.js app, World ID, relayer |
| `shared/` | Everyone | Types, constants, contract interface, mocks. Change only after telling the others. |

## Branches

```
feature/*  ──PR──►  dev  ──►  master  ──►  main
```

- Never commit directly to `dev`, `master` or `main`.
- Start every piece of work from `dev`: `feature/contracts` (Person 1), `feature/ai` (Person 2), `feature/app` (Person 3).
- Open a pull request from your feature branch into `dev`. Pull `dev` into your branch often to pick up `shared/` changes.
- When `dev` is working end to end, merge it into `master`, then `master` into `main`.
