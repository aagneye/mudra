# Mudra: build plan for ETHGlobal

> **Trends make stars rich. Mudra pays the person who started it.**

## 1. The idea in one paragraph

A creator posts a signature pose. Anyone can recreate it live in the app camera. AI scores how closely the recreation matches. Verified humans (World ID) vote, one vote per person per challenge. A brand or studio funds a challenge pool in USDC on Arc. When the challenge ends, a smart contract splits the pool automatically: a royalty to the original creator for every valid recreation, and the rest to the top recreators.

**Why blockchain (say this in the pitch):** a public, timestamped record of who started a pose, and automatic payouts to thousands of creators without anyone holding the money.

## 2. Scope decisions (to finish in time)

| Decision | Why |
|---|---|
| **Static pose, not a full dance move** | Comparing one pose frame is reliable and fast. A move is 3 keyframes at most, as a stretch goal. |
| **One challenge = one pose + one sponsor pool** | One flow, end to end. No feeds, follows or profiles beyond the minimum. |
| **Web app (Next.js), mobile browser** | Judges can scan a QR code at the booth and try it on their phone. |
| **Store keypoints + a thumbnail, not video** | Smaller data, easier privacy story, and enough to score and display. |
| **No new token** | Sponsors pay in USDC. |

## 3. Problems and how we solve them

**1. You can't legally own a pose.**
Mudra records *attribution* ("first verified human to post this pose, at this time"), not ownership. The royalty comes from sponsor pools, not from a legal claim. No NFT.

**2. Someone claims a famous pose before the real originator does.**
- Only World ID verified humans can register an original.
- When a pose is registered, its keypoints are compared to every existing pose. If similarity is above a threshold (e.g. 0.90), it is recorded as a **remix** with a pointer to the parent, not as a new original.
- **The key fix:** royalties are only paid inside sponsored challenges, and the **sponsor picks which registered pose the challenge is for**. A studio running a hook-step challenge picks the real choreographer's entry, so a squatter earns nothing. The onchain record is evidence; the sponsor is the one who decides.
- For the demo, use teammates' poses only, no celebrities.

**3. Matching poses accurately.**
- MediaPipe Pose runs in the browser and gives 33 body keypoints.
- Normalize: center on the hips and scale by torso length, so distance from the camera and body size don't matter.
- Compare **joint angles** (elbows, shoulders, hips, knees, about 10 angles) instead of raw positions. Angles don't change with position or scale. Score = weighted average angle difference, mapped to 0-100%.
- Then a 0G-hosted model gets both images and keypoints, gives the final verdict and feedback ("raise your left arm higher").
- Mirror check: also score the left/right flipped version and keep the better score, because front cameras mirror.

**4. Bots and fake votes.**
- World ID with `action = "vote-<challengeId>"`. The nullifier is the same every time one human proves for that action, so **one human gets one vote per challenge**. This solves both bots and the "cap votes per voter" problem.
- The contract stores used nullifiers and rejects a second vote, which is the failure path in the demo.
- Only entries with an AI score of at least 60% can receive votes.
- Final rank = 40% AI score + 60% vote share, so a group of friends voting together can't push a bad recreation to the top.

**5. The creator could spam fake recreations to farm the per-recreation royalty.**
This was a hidden problem in the earlier version. Fix: **submitting an entry also needs World ID** (`action = "enter-<challengeId>"`), one entry per human per challenge, and only entries scoring at least 60% count as valid. The creator's royalty is capped at a share of the pool (e.g. 30%).

**6. Where the money comes from.**
Brands and studios fund challenges from the marketing budget they already spend on influencers. The sponsor sets the rules when creating the challenge: pool size, royalty per valid entry, creator cap and deadline. The money sits in escrow in the contract, not with us.

**7. Stolen or AI-generated videos.**
- Capture only through the in-app camera, no gallery upload.
- Liveness prompt: the app shows a random countdown and a random instruction ("hold the pose, then raise your right hand") that must appear in the captured frames. A pre-recorded clip won't match a prompt it didn't know.
- World ID ties the entry to a real, unique human.

**8. Inappropriate content and minors.**
- The 0G model also returns a moderation flag. Flagged entries are hidden and held for review, never shown publicly.
- Be honest with judges: World ID proves humanness, not age. Sponsors can require age verification as a later step.

**9. Who do we trust for the AI score?**
The backend calls 0G, signs the result and posts the score onchain. For the hackathon, the backend is a trusted oracle, and we store the hash of the 0G response so anyone can check it. Say "verifiable inference" as the next step.

## 4. Payout math (contract logic)

```
validEntries   = entries with aiScore >= 60
creatorPayout  = min(validEntries * royaltyPerEntry, pool * creatorCapBps / 10000)
rest           = pool - creatorPayout
finalScore     = 0.4 * aiScore + 0.6 * (votes / maxVotes * 100)
top 3 by finalScore get rest split 50% / 30% / 20%
```

Anyone can call `finalize(challengeId)` after the deadline.

## 5. Repo layout (each person owns one folder, so no merge conflicts)

```
MUDRA/
├── PLAN.md
├── shared/            # interfaces everyone agrees on in hour 1 (types, ABI, API spec)
├── contracts/         # Person 1
├── ai/                # Person 2 (scoring library + scoring/moderation API)
└── app/               # Person 3 (Next.js frontend + World ID + wallet)
```

## 6. The split

### Person 1: Smart contracts and payouts (Arc)
Owns `contracts/`. Foundry, Solidity, Arc testnet, USDC.

**Builds**
- `PoseRegistry.sol`: `registerPose(poseHash, parentId, metadataURI)`, stores creator, timestamp and parent (remix pointer). Only the backend relayer can call it, after a World ID check.
- `ChallengePool.sol`:
  - `createChallenge(poseId, amount, royaltyPerEntry, creatorCapBps, deadline)`: sponsor deposits USDC (approve + transferFrom).
  - `submitEntry(challengeId, entrant, nullifierHash, captureHash)`: rejects a reused nullifier.
  - `postScore(entryId, score, responseHash)`: oracle only.
  - `vote(challengeId, entryId, nullifierHash)`: rejects a reused nullifier, rejects entries under 60.
  - `finalize(challengeId)`: the payout math above.
  - Events for everything, so the app can show the onchain trail.
- Relayer: a small script or API route that sends transactions from the backend wallet, so users don't need gas.
- Deploy script, a seeded demo challenge, and the ABI exported to `shared/abi/`.

**Done when:** the full flow runs in a Foundry test (create, 4 entries, scores, votes, a double vote reverts, finalize pays the correct amounts), deployed on Arc testnet, with addresses in `shared/addresses.json`.

### Person 2: AI pose engine (MediaPipe + 0G)
Owns `ai/`.

**Builds**
- `ai/pose/`: a small TypeScript library the app imports:
  - `extractKeypoints(videoFrame) -> Keypoints` (MediaPipe Pose, in the browser)
  - `normalize(kp)`, `jointAngles(kp)`
  - `similarity(a, b) -> 0..100` (with the mirror check)
- `ai/server/`: an API (Node/Express or Next.js API routes):
  - `POST /score`: `{ originalImage, originalKp, attemptImage, attemptKp }` → local similarity, then 0G model → `{ score, feedback, flagged, responseHash }`
  - `POST /check-original`: compares new pose keypoints to all registered poses → `{ isRemix, parentId, similarity }`
  - `POST /moderate` (can be combined with `/score`)
- 0G Compute integration: model choice, prompt, and a fallback to the local similarity score if 0G is slow (the demo must never wait on the network).

**Done when:** given two photos of the same pose it returns about 85-95, given different poses under 50, mirrored poses score the same, and `/score` returns feedback text from 0G in under ~5 seconds.

### Person 3: App, World ID and demo flow
Owns `app/`. Next.js, Tailwind, wagmi/viem, World IDKit.

**Builds**
- Screens:
  1. **Home**: list of active challenges (pool size, deadline, original creator).
  2. **Create pose**: camera, liveness countdown, capture, World ID, register (shows "Original" or "Remix of …").
  3. **Sponsor**: pick a registered pose, set the pool and rules, deposit USDC.
  4. **Challenge**: the original pose next to a live camera with a skeleton overlay and a live match % (uses Person 2's library), then submit.
  5. **Vote**: grid of entries with scores, vote with World ID, and a clear "You already voted" error.
  6. **Results**: payouts with links to the transactions on the Arc explorer.
- World IDKit integration and backend verification of proofs (the cloud verify API), then pass the nullifier to the relayer.
- QR code for judges to open the app on their phones.
- The 90-second demo script and the pitch slides.

**Done when:** a new person can do the whole demo on a phone without help.

## 7. Shared contract between the three (agree on this in the first hour)

Put these in `shared/` before anyone writes real code, and **each person builds against mocks** until the others are ready.

```ts
// shared/types.ts
type Keypoint  = { x: number; y: number; z: number; visibility: number };
type Keypoints = Keypoint[];               // 33 MediaPipe landmarks

type Pose      = { id: number; creator: string; parentId: number | null;
                   createdAt: number; thumbnailUrl: string; keypoints: Keypoints };
type Challenge = { id: number; poseId: number; sponsor: string; pool: string;   // USDC, 6 decimals
                   royaltyPerEntry: string; creatorCapBps: number; deadline: number;
                   finalized: boolean };
type Entry     = { id: number; challengeId: number; entrant: string;
                   score: number | null; votes: number; thumbnailUrl: string; flagged: boolean };
type ScoreResult = { score: number; feedback: string; flagged: boolean; responseHash: string };
```

- **Person 1 → others:** ABI + addresses in `shared/abi/` and `shared/addresses.json`. Until deployed, a local Anvil deployment.
- **Person 2 → Person 3:** the `ai/pose` library and the `/score` API spec. Until ready, `/score` returns a random 70-95 with fixed feedback.
- **Person 3 → Person 1:** the relayer request shape (`{ action, challengeId, entryId, nullifierHash, proof }`).

## 8. Timeline (about 36 hours)

| When | Person 1 (contracts) | Person 2 (AI) | Person 3 (app) |
|---|---|---|---|
| Hours 0-2 | Together: agree on `shared/`, set up the repo, get testnet USDC, World ID app ID, 0G access | | |
| Hours 2-10 | Contracts + tests | MediaPipe + similarity scoring | App shell, camera, skeleton overlay, World ID |
| Hours 10-18 | Deploy to Arc, relayer | 0G scoring, moderation, remix check | All screens with mocks |
| Hours 18-26 | Together: connect real contracts + real AI, fix bugs | | |
| Hours 26-32 | Seed demo data, explorer links | Tune thresholds with real phone photos | Polish UI, QR code, slides |
| Hours 32-36 | Rehearse the demo at least 5 times, record a backup video | | |

## 9. Demo (90 seconds)

1. Teammate A registers a signature pose. It's recorded onchain as an original.
2. A sponsor creates a 100 USDC challenge for that pose.
3. Teammate B recreates it live: the skeleton overlay shows **87% match** with 0G feedback.
4. Three judges vote with World ID. A judge tries a second vote and it is **rejected**.
5. Finalize: the creator's royalty and the top recreators' payouts appear, with Arc explorer links.

## 10. Partner tracks

- **World (IDKit):** one human, one entry and one vote per challenge, using nullifiers. The double-vote rejection is the failure path.
- **0G:** the AI judge, with scoring, feedback and moderation. (Optional: store thumbnails on 0G Storage.)
- **Arc:** USDC escrow pools and the automatic creator + winner split.

**Updated rating: 7.5/10.** The anti-farming fix (World ID for entries, not only votes) and the sponsor choosing the originator close the two biggest holes judges would find.
