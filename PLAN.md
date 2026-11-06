# Mudra

> **Trends make stars rich. Mudra pays the person who started it.**

Mudra (Sanskrit for a gesture or pose in dance) is a **World Mini App** for pose challenges. A creator posts a signature pose. Anyone can recreate it live with their phone camera, AI scores how closely they matched it, and verified humans vote. A brand or film studio funds the challenge in USDC, and a smart contract on **World Chain** pays the original creator a royalty for every valid recreation and pays the top recreators.

| Doc | For |
|---|---|
| This file | The idea, the problems and fixes, the payout rules, the demo |
| [docs/WORLD_MINI_APP.md](docs/WORLD_MINI_APP.md) | How a World Mini App is built and how Mudra uses it |
| [docs/abhimanyu-contracts.md](docs/abhimanyu-contracts.md) | Abhimanyu: smart contracts |
| [docs/aagneye-ai.md](docs/aagneye-ai.md) | Aagneye: pose AI and 0G |
| [docs/atul-app.md](docs/atul-app.md) | Atul: Mini App, World ID, relayer, demo |
| [shared/API.md](shared/API.md) | The interfaces between the three parts |

---

## 1. The problem

In India, film hook-step challenges spread across Reels and Shorts. The star or choreographer who created the move gets fame, but the money from those challenges goes to platforms and to whoever runs the brand campaign. Smaller creators who start a trend usually get nothing, and often not even credit.

## 2. The solution

1. **Create:** a creator captures a signature pose in the app and proves they're a unique human with World ID. Mudra records it onchain: who, when, and whether it's an original or a remix of an earlier pose.
2. **Sponsor:** a brand or studio picks a registered pose, deposits a USDC prize pool, and sets the rules (royalty per valid entry, creator cap, deadline).
3. **Recreate:** anyone opens Mudra in World App, sees the original next to their live camera with a skeleton overlay, and captures their attempt. AI scores the match (e.g. 87%) and gives tips ("raise your left arm higher").
4. **Vote:** verified humans vote for the best recreation, one vote per human per challenge.
5. **Pay out:** after the deadline, the contract pays the creator a royalty for every valid recreation, and splits the rest among the top 3.

**Why blockchain (one line for the pitch):** a public, timestamped record of who started a pose, and automatic payouts to thousands of creators without anyone holding the money.

**Why a World Mini App:** every user already has a wallet, a username and World ID inside World App. No sign-up, no seed phrases, no gas. Judges scan a QR code and they're in.

## 3. Scope (so we finish)

| Decision | Why |
|---|---|
| Static pose, not a full dance move | One frame is reliable and fast to compare. A 3-keyframe move is a stretch goal. |
| One challenge = one pose + one pool | One flow, end to end. No feeds, follows or profiles beyond usernames. |
| Store keypoints + a small thumbnail, not video | Less data, easier privacy, enough to score and display. |
| No new token | Sponsors pay in USDC. A new token has no value unless someone pays into it. |
| Players never send transactions | Our relayer sends them after checking World ID. Players pay no gas and need no USDC to play. |
| Sponsors use a normal desktop page | Brands aren't World App users. |
| World Chain Sepolia for the hackathon | Free testnet funds, same chain Mini Apps use. |

## 4. Problems and how we solve them

**1. You can't legally own a pose.**
Mudra records *attribution* ("first verified human to post this pose, at this time"), not ownership. No NFT. The royalty comes from sponsor pools, not from a legal claim.

**2. Someone claims a famous pose before the real originator.**
- Only World ID verified humans can register a pose.
- Each new pose is compared with every registered pose. At 90% similarity or more, it's recorded as a **remix** pointing to the earlier pose.
- **The main fix:** royalties are only paid inside sponsored challenges, and **the sponsor chooses which registered pose the challenge is for**. A studio running a hook-step challenge picks the real choreographer's entry, so a squatter earns nothing. The onchain record is evidence; the sponsor decides.
- In the demo, use teammates' poses, never real celebrities.

**3. Matching poses accurately.**
- MediaPipe Pose runs in the browser and finds 33 body points.
- Normalize: center on the hips and scale by torso length, so distance from the camera and body size don't matter.
- Compare about 10 **joint angles** (elbows, shoulders, hips, knees), which don't change with position or size. Map the weighted difference to 0-100%.
- Front cameras mirror the image, so also score the flipped pose and keep the better score.
- A 0G-hosted model then looks at both images and the points, gives the final score, feedback and a moderation flag.

**4. Bots and fake votes.**
- Voting needs World ID with the action `vote-<challengeId>`. One human always gets the same nullifier for that action, so **one human gets one vote per challenge**. This handles both bots and "cap votes per voter".
- The contract stores used nullifiers and rejects a second vote. This is the failure path in the demo.
- Only entries with an AI score of 60% or more can get votes.
- Final rank = 40% AI score + 60% vote share, so a group of friends can't push a bad recreation to the top.

**5. The creator could farm royalties with fake recreations.**
Entering also needs World ID (`enter-<challengeId>`): one entry per human per challenge. Only entries scoring 60% or more count, and the creator's royalty is capped at a share of the pool (e.g. 30%).

**6. Where the money comes from.**
Brands and studios fund challenges from the marketing budget they already spend on influencer campaigns. The money sits in the contract, not with us. **The contract has no admin withdraw** (this is also a World Mini App rule). If a challenge ends with no valid entries, only the sponsor can take their own deposit back.

**7. Stolen or AI-generated videos.**
- Capture only through the in-app camera, no gallery uploads.
- Liveness prompt: a random countdown and a random instruction ("hold the pose, then raise your right hand") that must show up in the capture. A pre-recorded clip can't know the prompt.
- World ID ties each entry to a real, unique human.

**8. Inappropriate content and minors.**
- The 0G model returns a moderation flag. Flagged entries are hidden and held for review.
- Be honest with judges: World ID proves you're a unique human, not your age. Age checks are future work.

**9. Who do we trust for the AI score?**
For the hackathon, our AI server is a trusted oracle: it posts the score onchain with a hash of the 0G response so anyone can check it later. Verifiable AI results are the next step.

**10. Is this gambling?**
No. World's guidelines don't allow chance-based prizes, and Mudra has no randomness: winners are decided by match score and human votes. Call it a "skill-based challenge".

## 5. Payout rules

```
validEntries   = entries with aiScore >= 60 and not flagged
creatorPayout  = min(validEntries × royaltyPerEntry, pool × creatorCapBps / 10000)
rest           = pool − creatorPayout
finalScore     = 0.4 × aiScore + 0.6 × (votes / maxVotes × 100)
top 3 by finalScore get rest split 50% / 30% / 20%
fewer than 3 valid entries → the unused share goes to rank 1
no valid entries → creator gets nothing, sponsor can reclaim the pool
```

Anyone can call `finalize(challengeId)` after the deadline. Example: a 100 USDC pool, 2 USDC per entry, 30% cap, 12 valid entries → creator gets 24 USDC, winners split 76 USDC (38 / 22.80 / 15.20).

## 6. Architecture

```
 Phone: World App                                     Desktop browser
 ┌──────────────────────────────┐                    ┌──────────────────┐
 │ Mudra Mini App (Next.js)     │                    │ /sponsor (wagmi) │
 │  MiniKit walletAuth          │                    └────────┬─────────┘
 │  IDKit World ID              │                             │ approve + createChallenge
 │  Camera + MediaPipe          │                             │
 └──────┬───────────────┬───────┘                             │
        │               │                                     │
        │ /api/relay    │ /score, /check-original             │
        ▼               ▼                                     ▼
 ┌──────────────┐  ┌───────────────────────┐   ┌──────────────────────────┐
 │ Relayer      │  │ AI server (Aagneye)   │   │ World Chain Sepolia      │
 │ (Atul)       │  │  joint-angle score    │──►│  PoseRegistry            │
 │  verify      │  │  0G model: score,     │   │  ChallengePool + USDC    │
 │  World ID    │──┼─►feedback, moderation │   │  (Abhimanyu)             │
 │  send tx     │──┼───────────────────────┼──►│                          │
 └──────────────┘  └───────────────────────┘   └──────────────────────────┘
```

## 7. Team

| Person | Owns | Folder | Branch | Guide |
|---|---|---|---|---|
| **Abhimanyu** | Smart contracts on World Chain: pose registry, USDC pools, nullifier checks, payouts, deploy | `contracts/` | `feature/contracts` | [abhimanyu-contracts.md](docs/abhimanyu-contracts.md) |
| **Aagneye** | Pose AI: MediaPipe, similarity scoring, 0G scoring/feedback/moderation, remix check, oracle | `ai/` | `feature/ai` | [aagneye-ai.md](docs/aagneye-ai.md) |
| **Atul** | World Mini App: screens, camera, MiniKit, World ID, relayer, sponsor page, demo and pitch | `app/` | `feature/app` | [atul-app.md](docs/atul-app.md) |

Everyone builds against `shared/` and the mocks in `shared/mocks.ts` until the real parts are ready.

## 8. Timeline (about 36 hours)

| Hours | Abhimanyu (contracts) | Aagneye (AI) | Atul (app) |
|---|---|---|---|
| 0-2 | **Together:** read this plan, agree on `shared/`, install World App on every phone, Developer Portal app, Sepolia funds, 0G access | | |
| 2-10 | Contracts + Foundry tests | MediaPipe + joint-angle scoring | Mini App template, walletAuth, **camera test inside World App**, IDKit |
| 10-18 | Deploy to World Chain Sepolia, export ABIs | 0G scoring, moderation, remix check, oracle `postScore` | All screens on mocks, relayer route, sponsor page |
| 18-26 | **Together:** connect real contracts and the real AI, fix bugs | | |
| 26-32 | Seed demo data, explorer links | Tune thresholds with real phone photos | Polish UI, QR code, slides |
| 32-36 | **Together:** rehearse the demo 5+ times, record a backup video | | |

## 9. Demo (90 seconds)

1. Abhimanyu registers a signature pose in World App. It's recorded onchain as an original.
2. A sponsor creates a 100 USDC challenge for that pose from the desktop page.
3. Aagneye recreates it live: the skeleton overlay shows **87% match** with feedback from 0G.
4. Three judges scan the QR code and vote with World ID. One tries to vote again and gets **"You already voted"**, rejected by the contract.
5. Finalize: the creator's royalty and the winners' payouts appear, with World Chain explorer links.

## 10. Partner tracks

- **World:** a full Mini App (MiniKit sign-in, usernames, wallet payouts) plus World ID for one entry and one vote per human. The double-vote rejection is the failure path.
- **0G:** the AI judge, which does scoring, feedback and moderation. Optional: store thumbnails on 0G Storage.

We dropped Arc because Mini App transactions run on World Chain.

## 11. After the hackathon

- Verify World ID inside the contract, so nobody needs to trust our relayer.
- Verifiable AI scoring.
- Dance moves (sequences of poses), not only single poses.
- Studio dashboard with campaign analytics.
- Age checks and legal review per country.
