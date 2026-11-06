# Mudra APIs

Types are in [types.ts](types.ts). Agreed numbers are in [constants.ts](constants.ts). The contract interface is in [IMudra.sol](IMudra.sol).

```
Phone (app/)  ──camera + MediaPipe──►  ai/pose (runs in the browser)
     │
     ├── POST /api/score ───────────►  ai/server ──► 0G Compute
     │                                    └──► postScore() onchain (oracle wallet)
     ├── POST /api/check-original ──►  ai/server
     │
     ├── IDKit proof
     └── POST /api/relay ───────────►  app/ API route: verify World ID ──► relayer wallet ──► contracts on Arc
```

## AI service (Person 2), base URL in `AI_URL`

### `POST /score`
Request `ScoreRequest`, response `ScoreResult`.
- Always answers within `ZERO_G_TIMEOUT_MS` + 1s. If 0G is slow, return `source: "local-fallback"`.
- If `entryId` is passed as a query param (`/score?entryId=7`), also call `postScore` onchain.

### `POST /check-original`
Request `CheckOriginalRequest`, response `CheckOriginalResult`.
- Compares against every registered pose. `similarity >= REMIX_THRESHOLD` means `isRemix: true`.

## Relayer (Person 3 builds the route, Person 1 owns the contract calls), `POST /api/relay`

Request `RelayRequest`, response `RelayResult`.

1. Verify `proof` with World's cloud verify API using the action from `worldIdAction` (`register-pose`, `enter-<id>`, `vote-<id>`).
2. Send the transaction from the relayer wallet, passing `nullifier_hash` as a `uint256`.
3. Map contract errors: `AlreadyVoted` → `ALREADY_VOTED`, `AlreadyEntered` → `ALREADY_ENTERED`, `ScoreTooLow` → `SCORE_TOO_LOW`, `ChallengeClosed` → `CHALLENGE_CLOSED`.

The contract check is the real guarantee; the backend check is only for a quick, friendly error.

## Environment variables

| Name | Used by | What |
|---|---|---|
| `NEXT_PUBLIC_WORLD_APP_ID` | app | World ID app ID from the developer portal |
| `AI_URL` | app | Base URL of ai/server |
| `RPC_URL` | app, ai, contracts | Arc testnet RPC |
| `RELAYER_PRIVATE_KEY` | app (server only) | Sends registerPose / submitEntry / vote |
| `ORACLE_PRIVATE_KEY` | ai/server | Sends postScore |
| `ZERO_G_*` | ai/server | 0G Compute credentials |
| `USE_MOCKS` | all | `true` until hours 18-26 |

Never commit `.env` files. Use `.env.example`.
