# Mudra APIs

Types are in [types.ts](types.ts). Agreed numbers are in [constants.ts](constants.ts). The contract interface is in [IMudra.sol](IMudra.sol). How the Mini App pieces work is in [docs/WORLD_MINI_APP.md](../docs/WORLD_MINI_APP.md).

```
World App (phone)
  Mudra Mini App (app/, Atul)
     │  camera + ai/pose (MediaPipe, in the browser)
     │
     ├── POST {AI_URL}/score?entryId= ─────► ai/server (Aagneye) ──► 0G Compute
     │                                           └──► ChallengePool.postScore()  (oracle wallet)
     ├── POST {AI_URL}/check-original ─────► ai/server
     │
     ├── IDKit (World ID) ──► result
     └── POST /api/relay {kind, result, ...} ► app API route (Atul)
                                                 1. walletAuth session → user's address
                                                 2. POST developer.world.org/api/v4/verify/{RP_ID}
                                                 3. relayer wallet ──► PoseRegistry / ChallengePool (Abhimanyu)
                                                                        on World Chain Sepolia (4801)
Desktop browser
  /sponsor (wagmi) ──► USDC.approve + ChallengePool.createChallenge
```

## AI service (Aagneye), base URL in `AI_URL`

### `POST /score`
Request `ScoreRequest`, response `ScoreResult`.
- Always answers within `ZERO_G_TIMEOUT_MS` + 1 s. If 0G is slow, return `source: "local-fallback"`.
- With `?entryId=7`, it also calls `postScore` onchain from the oracle wallet.

### `POST /check-original`
Request `CheckOriginalRequest`, response `CheckOriginalResult`.
- Compares with every registered pose. `similarity >= REMIX_THRESHOLD` means `isRemix: true`.

## Relayer (Atul), `POST /api/relay`

Request `RelayRequest`, response `RelayResult`.

1. Read the user's address from the walletAuth session. If there's none, return `NOT_SIGNED_IN`. Never trust an address from the request body.
2. Check the action matches the request (`register-pose`, `enter-<challengeId>`, `vote-<challengeId>` from `worldIdAction`).
3. Forward `result` unchanged to `POST https://developer.world.org/api/v4/verify/{RP_ID}`. Continue only if `success === true`.
4. Send the transaction from the relayer wallet with the verified nullifier as a `uint256`.
5. Map contract errors:

| Contract error | `RelayError` |
|---|---|
| `AlreadyEntered` | `ALREADY_ENTERED` |
| `AlreadyVoted` | `ALREADY_VOTED` |
| `ScoreTooLow` | `SCORE_TOO_LOW` |
| `ChallengeClosed` | `CHALLENGE_CLOSED` |
| `TooManyEntries` | `TOO_MANY_ENTRIES` |

The contract is what guarantees one entry and one vote per human. Any check on the server is only for a faster, friendlier error.

## Environment variables

| Name | Used by | What |
|---|---|---|
| `NEXT_PUBLIC_APP_ID` | app | Mini App `app_id` from the Developer Portal |
| `NEXT_PUBLIC_WORLD_ID_APP_ID` | app | World ID `app_id` |
| `RP_ID` | app (server) | World ID relying party ID, used in the verify URL |
| `RP_SIGNING_KEY` | app (server) | Signs IDKit requests. Secret. |
| `RELAYER_PRIVATE_KEY` | app (server) | Sends registerPose / submitEntry / vote / finalize |
| `ORACLE_PRIVATE_KEY` | ai/server | Sends postScore |
| `ZERO_G_API_KEY` | ai/server | 0G Compute access |
| `RPC_URL` | all | `https://worldchain-sepolia.g.alchemy.com/public` |
| `AI_URL` | app | Base URL of ai/server |
| `USE_MOCKS` | all | `true` until hours 18-26 |

Never commit `.env` files. Copy [.env.example](../.env.example).
