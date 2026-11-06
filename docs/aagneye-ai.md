# Aagneye: pose AI and 0G

**Folder:** `ai/` · **Branch:** `feature/ai` · **Stack:** TypeScript, `@mediapipe/tasks-vision`, Node (Express), 0G Compute, viem

You own the part that makes Mudra fun: how well did you match the pose, what should you fix, is this pose new or a remix, and is the content safe. Read [PLAN.md](../PLAN.md) section 4 (problems 3, 7, 8, 9) and [shared/API.md](../shared/API.md) first.

## What you build

### 1. `ai/pose/`: a library the app imports (runs in the browser)
| Function | What it does |
|---|---|
| `createPoseDetector()` | Loads MediaPipe `PoseLandmarker` (lite model, `runningMode: "VIDEO"`) |
| `extractKeypoints(frame) -> Keypoints` | 33 landmarks for one video frame or image |
| `normalize(kp)` | Center on the midpoint of the hips, scale by torso length (shoulder midpoint to hip midpoint) |
| `jointAngles(kp)` | About 10 angles: both elbows, shoulders, hips, knees, plus torso tilt and head tilt |
| `similarity(a, b) -> 0..100` | Weighted angle difference mapped to a score. Also scores the left-right flipped pose and keeps the better one, because front cameras mirror |
| `poseHash(kp)` | keccak256 of the normalized points rounded to 3 decimals, for the contract |

Rules:
- Ignore landmarks with `visibility < 0.5`. Don't treat them as zero. If too few are visible, return a clear "step back so your whole body is in frame" error.
- Score mapping to start with: average angle difference 0° → 100, 45° or more → 0, linear in between. Tune it with real photos.
- Keep it fast enough for a live overlay (~15 fps on a mid-range phone).

### 2. `ai/server/`: the API (see [shared/API.md](../shared/API.md))
- **`POST /score`** (`ScoreRequest` → `ScoreResult`)
  1. Compute `localScore` with `similarity()`.
  2. Send both images, both sets of keypoints and the local score to a vision model on **0G Compute**. Ask for JSON: `{ score, feedback, flagged }`. Feedback is one short, friendly tip ("Raise your left arm higher").
  3. If 0G doesn't answer within `ZERO_G_TIMEOUT_MS` (5 s), return `localScore` with `source: "local-fallback"`. **The demo must never wait on the network.**
  4. `responseHash` = keccak256 of the raw 0G response.
  5. If `?entryId=` is given, call `ChallengePool.postScore(entryId, score, flagged, responseHash)` from the **oracle wallet**.
- **`POST /check-original`** (`CheckOriginalRequest` → `CheckOriginalResult`): compare with every registered pose (read from `PoseRegistry` events or a local cache). Similarity ≥ 90 → `isRemix: true` with `parentId`.
- **Moderation:** the 0G prompt also returns `flagged` for nudity, violence or a child in the frame. When in doubt, flag it.
- **Server-side keypoints (backup):** if MediaPipe doesn't load inside the World App webview, accept just the images and extract keypoints on the server instead. Atul will tell you the camera test result in hour 2.

## Setup

```bash
git checkout feature/ai && git pull origin dev
cd ai
npm init -y
npm install @mediapipe/tasks-vision express cors viem
npm install -D typescript tsx @types/express @types/node
```

`.env` (never commit it):
```bash
PORT=4000
RPC_URL=https://worldchain-sepolia.g.alchemy.com/public
ORACLE_PRIVATE_KEY=0x...    # give Abhimanyu the address, not the key
ZERO_G_API_KEY=...          # plus whatever else 0G Compute needs
CHALLENGE_POOL_ADDRESS=     # from shared/addresses.json
POSE_REGISTRY_ADDRESS=
```

0G: at hour 0, get access from the 0G team at the venue, pick a vision model on 0G Compute and get one request working before writing anything else around it.

## Checklist

- [ ] Same pose, two photos of the same person → 85-95
- [ ] Same pose, two different teammates → 75-90
- [ ] Clearly different pose → under 50
- [ ] Mirrored pose scores the same as the original
- [ ] Partly out of frame → clear error, not a random score
- [ ] `/score` answers in under 5 s, with a fallback on timeout or error
- [ ] Feedback text is short and useful
- [ ] A test image that should be flagged gets `flagged: true`
- [ ] `/check-original` calls a near-copy a remix
- [ ] `postScore` lands onchain from the oracle wallet
- [ ] Thresholds tuned with real phone photos taken inside World App

## Hand-offs

| To | What | When |
|---|---|---|
| Atul | `ai/pose` library (even with rough scoring) so the live overlay works | Hour 8 |
| Abhimanyu | Oracle wallet address | Hour 2 |
| Atul | `/score` and `/check-original` running locally (`AI_URL`) | Hour 16 |
| Everyone | Tuned thresholds (update `shared/constants.ts` if they change) | Hour 30 |

## Done when
A teammate can recreate a pose in World App and see a fair score with a useful tip in under 5 seconds, and the score shows up onchain.
