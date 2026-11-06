# ai/ (Person 2)

Pose matching in the browser, and a scoring and moderation API backed by 0G Compute.

## Parts

- `pose/`: a TypeScript library the app imports
  - `extractKeypoints(frame) -> Keypoints` with `@mediapipe/tasks-vision` (PoseLandmarker)
  - `normalize(kp)`: center on the midpoint of the hips, scale by torso length
  - `jointAngles(kp)`: about 10 angles (elbows, shoulders, hips, knees, and the neck tilt)
  - `similarity(a, b) -> 0..100`: weighted angle difference, also tries the mirrored pose and keeps the best score
- `server/`: implements `POST /score` and `POST /check-original` from [`shared/API.md`](../shared/API.md)

## Setup

```bash
cd ai
npm init -y
npm install @mediapipe/tasks-vision express viem
npm install -D typescript tsx @types/express @types/node
```

## Checklist

- [ ] Same pose, two photos → 85-95
- [ ] Different pose → under 50
- [ ] Mirrored pose scores the same as the unmirrored one
- [ ] Low-visibility landmarks (< 0.5) are ignored, not treated as zero
- [ ] 0G returns feedback text and a moderation flag in under 5 s
- [ ] Falls back to the local score on 0G timeout or error
- [ ] `postScore` sent from the oracle wallet with the hash of the 0G response
- [ ] Thresholds tested with real phone photos of teammates
