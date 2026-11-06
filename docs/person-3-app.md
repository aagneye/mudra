# app/ (Person 3)

Next.js mobile web app, World IDKit, wagmi/viem, and the `/api/relay` route.

## Setup

Run from the repo root. This creates the `app/` folder.

```bash
npx create-next-app@latest app --ts --tailwind --app --eslint --src-dir --use-npm --disable-git
```

Then, inside `app/`:

```bash
npm install @worldcoin/idkit wagmi viem @tanstack/react-query qrcode.react
```

Import shared types with a relative path (`../../shared/types`) or add a `@shared/*` path alias in `tsconfig.json`.

## Screens

1. `/`: active challenges
2. `/create`: camera, liveness countdown, capture, World ID (`register-pose`), shows Original or Remix
3. `/sponsor`: pick a pose, set the pool and rules, approve + `createChallenge`
4. `/c/[id]`: original next to the live camera with skeleton overlay and live match %, submit with World ID (`enter-<id>`)
5. `/c/[id]/vote`: entries grid, vote with World ID (`vote-<id>`), clear "You already voted" message
6. `/c/[id]/results`: payouts with Arc explorer links

## Checklist

- [ ] Works on a phone browser (front camera, portrait)
- [ ] All screens work with `USE_MOCKS=true` using `shared/mocks.ts`
- [ ] `/api/relay` verifies the World ID proof before sending a transaction
- [ ] QR code page for judges
- [ ] Demo script rehearsed, backup video recorded
