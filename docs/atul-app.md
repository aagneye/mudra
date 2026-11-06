# Atul: World Mini App, World ID, relayer and demo

**Folder:** `app/` · **Branch:** `feature/app` · **Stack:** Next.js (World's Mini App template), MiniKit, IDKit, viem, wagmi (sponsor page), Tailwind

You own everything users touch: the Mini App inside World App, World ID, the relayer that sends transactions for users, the sponsor page, and the demo. Read [PLAN.md](../PLAN.md) and **[WORLD_MINI_APP.md](WORLD_MINI_APP.md)** (it has the code for each piece) first.

## Hour 0-2 (before anyone else gets blocked)

1. Install World App on all three phones.
2. Create the app in the [Developer Portal](https://developer.world.org). Get the Mini App `app_id` and World ID `app_id`, `rp_id` and signing key. Share the public IDs with the team.
3. Create the Mini App from the template:
   ```bash
   git checkout feature/app && git pull origin dev
   npx @worldcoin/create-mini-app@latest app
   ```
4. Start a tunnel (`ngrok http 3000`), set the URL in the Developer Portal, and open it in World App.
5. **Camera test inside World App:** does `getUserMedia({ video: { facingMode: "user" } })` work? Does MediaPipe load? Tell Aagneye the result. If the camera fails, use Plan B from [WORLD_MINI_APP.md §3.3](WORLD_MINI_APP.md#33-camera).
6. Make the relayer wallet, fund it from the [faucet](https://www.l2faucet.com/world), and send the address to Abhimanyu.

## Screens

| Route | What it does | Uses |
|---|---|---|
| `/` | Active challenges: pose thumbnail, creator username, pool, time left | contract reads |
| `/onboarding` | Sign in with `walletAuth`, consent screen for camera and storing a thumbnail | MiniKit |
| `/create` | Camera → liveness prompt → capture → `/check-original` → World ID (`register-pose`) → relay. Shows "Original" or "Remix of @user" | MediaPipe, AI, IDKit, relay |
| `/c/[id]` | Original next to the live camera with skeleton overlay and live match % → capture → World ID (`enter-<id>`) → relay → `/score?entryId=` → show score + tip | `ai/pose`, AI, IDKit, relay |
| `/c/[id]/vote` | Grid of entries scoring 60+. Vote with World ID (`vote-<id>`). Clear **"You already voted"** message | IDKit, relay |
| `/c/[id]/results` | Creator royalty + top 3 payouts with explorer links | contract events |
| `/sponsor` | **Desktop page** with wagmi: pick a pose, set pool/royalty/cap/deadline, `approve` + `createChallenge` | wagmi |
| `/qr` | Big QR code for the booth: `https://worldcoin.org/mini-app?app_id=<APP_ID>` | |

Design: mobile first, portrait, big buttons, **usernames instead of addresses**, no World logo, no "World" in the app name.

## API routes (server only)

| Route | What it does |
|---|---|
| `/api/nonce`, `/api/complete-siwe` | walletAuth sign-in (see the template) |
| `/api/rp-context` | Signs IDKit requests with `RP_SIGNING_KEY` |
| `/api/relay` | `RelayRequest` → verify the IDKit result at `https://developer.world.org/api/v4/verify/{RP_ID}` → send the transaction from the relayer wallet → map contract errors to `RelayResult` (see [shared/API.md](../shared/API.md)) |
| `/api/finalize` | Calls `finalize(challengeId)` for the demo button |

The **liveness prompt**: a random countdown (3-6 s) plus a random instruction ("hold the pose, then raise your right hand"). Save which prompt was shown with the capture.

## Env (`app/.env.local`, never commit it)
See [WORLD_MINI_APP.md §8](WORLD_MINI_APP.md#8-environment-variables).

## Checklist

- [ ] Opens in World App from the QR code and signs in with walletAuth
- [ ] Camera + skeleton overlay work inside World App (or Plan B works)
- [ ] All screens work with `USE_MOCKS=true` using `shared/mocks.ts`
- [ ] World ID works for all three actions (simulator for testing, real phones for the demo)
- [ ] `/api/relay` never sends a transaction without a verified proof
- [ ] Second vote shows "You already voted" from the real contract
- [ ] Sponsor page creates a challenge on World Chain Sepolia
- [ ] Results page links to the explorer
- [ ] Contracts and USDC allowlisted in the Developer Portal
- [ ] A new person can do the whole demo on their phone without help

## Demo and pitch (also yours)

- 90-second demo script ([PLAN.md §9](../PLAN.md#9-demo-90-seconds)), rehearsed 5+ times, plus a backup screen recording.
- 4-5 slides: the problem (hook-step trends), the line "Trends make stars rich. Mudra pays the person who started it.", how it works, why World + 0G, what's next.
- Seeded demo data: one original pose, one funded challenge, a few entries.

## Hand-offs

| From | What | When |
|---|---|---|
| Aagneye | `ai/pose` library | Hour 8 |
| Abhimanyu | Local ABIs + Anvil deployment | Hour 10 |
| Aagneye | `/score`, `/check-original` | Hour 16 |
| Abhimanyu | Sepolia addresses | Hour 18 |

## Done when
A judge scans the QR code, signs in, recreates a pose, votes, and sees the payouts, all on their own phone.
