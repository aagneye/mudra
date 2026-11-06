# Building Mudra as a World Mini App

A World Mini App is a normal web app (we use Next.js) that opens inside **World App** on the user's phone. World App provides a wallet, a username and World ID, so our users never install anything, never manage seed phrases, and never pay gas. This guide explains how Mini Apps work and exactly how Mudra uses each piece.

Sources (read these when stuck): [Mini Apps docs](https://docs.world.org/mini-apps), [IDKit in Mini Apps](https://docs.world.org/world-id/idkit/mini-apps.md), [sendTransaction](https://docs.world.org/mini-apps/commands/send-transaction.md), [Testing](https://docs.world.org/mini-apps/quick-start/testing.md), [App guidelines](https://docs.world.org/mini-apps/guidelines/app-guidelines.md), [Smart contract guidelines](https://docs.world.org/mini-apps/guidelines/smart-contract-development-guidelines.md).

---

## 1. How a Mini App works

```
┌───────────────────── World App (phone) ─────────────────────┐
│                                                              │
│   Webview (WKWebView on iOS, WebView on Android)             │
│   ┌──────────────────────────────────────────────┐          │
│   │  Our Next.js app (https://mudra.<tunnel>)    │          │
│   │                                              │          │
│   │  MiniKit  ──► walletAuth, sendTransaction,   │          │
│   │               share, requestPermission       │          │
│   │  IDKit    ──► World ID proof (one human)     │          │
│   └──────────────────────────────────────────────┘          │
│                                                              │
│   World App wallet (smart account on World Chain)            │
└──────────────────────────────────────────────────────────────┘
            │                                   │
            ▼                                   ▼
   Our backend (Next.js API routes)     World Chain (chain 480, Sepolia 4801)
   - verifies World ID proofs              - PoseRegistry, ChallengePool
   - relayer wallet sends transactions     - USDC
```

| Piece | What it is | Package |
|---|---|---|
| **MiniKit** | The bridge between our web page and World App: wallet sign-in, transactions, sharing, permissions | `@worldcoin/minikit-js` (+ `@worldcoin/minikit-react` for hooks) |
| **IDKit** | World ID proofs ("this is a unique human"). In MiniKit 2.x, World ID moved out of MiniKit into IDKit | `@worldcoin/idkit` |
| **Developer Portal** | Where we register the app, get IDs and keys, and allowlist contracts | [developer.world.org](https://developer.world.org) |
| **World Chain** | The L2 that Mini App transactions run on | chain ID `480` (mainnet), `4801` (Sepolia) |

---

## 2. Setup, step by step

### 2.1 Developer Portal (Atul, hour 0)
1. Sign in at [developer.world.org](https://developer.world.org) and create an app named **Mudra**. Don't put "World" in the app name; the guidelines don't allow it.
2. Note these values:
   - **Mini App `app_id`** (`app_...`)
   - **World ID**: `app_id`, `rp_id` and the **signing key**. The signing key is a secret and must only be used on the server.
3. Create the World ID actions we need, or make sure the app allows dynamic actions: `register-pose`, `enter-<challengeId>`, `vote-<challengeId>`.
4. Later (after Abhimanyu deploys): **Mini App → Permissions → Contract Entrypoints** and **Permit2 Tokens**. Add our contracts and USDC. Calls to anything not on the allowlist fail with `invalid_contract`.

### 2.2 Create the app from the official template
```bash
npx @worldcoin/create-mini-app@latest app
```
This creates `app/` with Next.js, MiniKit already wired up and a sign-in example. The docs recommend `pnpm`.

If you add MiniKit to an existing app instead:
```bash
pnpm install @worldcoin/minikit-js @worldcoin/minikit-react @worldcoin/idkit
```
```tsx
// app/src/app/providers.tsx
"use client";
import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <MiniKitProvider>{children}</MiniKitProvider>;
}
```

### 2.3 Know whether you're inside World App
```ts
import { MiniKit } from "@worldcoin/minikit-js";

if (!MiniKit.isInstalled()) {
  // Opened in a normal browser: show "Open in World App" + QR code
}
```
Sponsor pages (`/sponsor`) are meant for normal desktop browsers, so they skip this check (see section 4).

---

## 3. The four things Mudra uses

### 3.1 Sign in: `walletAuth`
Gives us the user's World App wallet address (where payouts go) and their username. Show **usernames, not wallet addresses**; the guidelines ask for this.

```ts
const nonce = await fetch("/api/nonce").then(r => r.text()); // server makes and stores the nonce
const { data } = await MiniKit.walletAuth({ nonce, statement: "Sign in to Mudra" });
// send `data` to /api/complete-siwe; the server checks the SIWE message and nonce, then sets a session
```

### 3.2 One human, one action: IDKit (World ID)
Used three times, each with its own **action**. World ID returns a **nullifier**, which is the same every time the same human proves for the same action. That is how we get "one per human":

| When | Action | What the nullifier stops |
|---|---|---|
| Registering an original pose | `register-pose` | (only proves a real human registered it) |
| Entering a challenge | `enter-<challengeId>` | one human entering twice, or the creator farming royalties with fake entries |
| Voting | `vote-<challengeId>` | one human voting twice |

**Server: sign the request** (the signing key never reaches the browser)
```ts
// app/src/app/api/rp-context/route.ts
import { signRequest } from "@worldcoin/idkit-core/signing";

export async function POST(req: Request) {
  const { action } = await req.json();
  const { sig, nonce, createdAt, expiresAt } = signRequest({
    signingKeyHex: process.env.RP_SIGNING_KEY!,
    action,
  });
  return Response.json({ sig, nonce, createdAt, expiresAt });
}
```

**Client: show the widget**
```tsx
import { IDKitRequestWidget, proofOfHuman } from "@worldcoin/idkit";

<IDKitRequestWidget
  open={open}
  onOpenChange={setOpen}
  app_id={process.env.NEXT_PUBLIC_WORLD_ID_APP_ID!}   // World ID app_id, not the Mini App app_id
  action={`vote-${challengeId}`}
  rp_context={rpContext}                               // from /api/rp-context
  allow_legacy_proofs={true}
  preset={proofOfHuman({ signal: String(entryId) })}  // binds the proof to this entry
  handleVerify={(result) =>                            // our server verifies + sends the transaction
    fetch("/api/relay", { method: "POST", body: JSON.stringify({ kind: "vote", challengeId, entryId, result }) })
  }
  onSuccess={() => showToast("Vote counted")}
  onError={(code) => showToast(code)}
/>
```

**Server: verify the proof**, then send the transaction
```ts
// forward the IDKit result unchanged
const res = await fetch(`https://developer.world.org/api/v4/verify/${process.env.RP_ID}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(result),
});
const body = await res.json();
if (!body.success) return error("INVALID_PROOF");
// then: relayer wallet calls ChallengePool.vote(challengeId, entryId, nullifier)
// the contract rejects a nullifier it has already seen -> "ALREADY_VOTED"
```

The World docs say storing nullifiers and enforcing uniqueness is the app's job. We do it **in the contract** (a mapping of used nullifiers), so the "second vote rejected" moment in the demo happens onchain.

**For testing without an Orb-verified phone:** use the [World ID simulator](https://simulator.worldcoin.org/) with `environment: "staging"`.

**Stretch goal:** verify the proof inside the contract instead of on our server, using World's onchain verifier on World Chain (see [onchain verification](https://docs.world.org/world-id/idkit/onchain-verification.md)). Then nobody has to trust our relayer. Only do this if everything else works.

### 3.3 Camera
The webview docs say camera access is possible "if the user grants permission", but they don't give a camera example, and camera isn't in MiniKit's `requestPermission` list. **Atul tests this on a real phone inside World App in the first hour.**

- **Plan A:** `navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })` with a live skeleton overlay from MediaPipe.
- **Plan B (if the live camera fails in the webview):** `<input type="file" accept="image/*" capture="user">`. On phones this opens the camera directly, without a gallery picker. We lose the live overlay but keep the flow.
- Also check that MediaPipe's WASM model loads inside the webview. If it doesn't, Aagneye's API extracts keypoints on the server from the uploaded photo.
- Ask for consent before capturing. The guidelines require approval before storing user data.

### 3.4 Transactions: who sends them
| Action | Who sends it | How |
|---|---|---|
| Register pose, submit entry, vote | **Our relayer wallet** | Server-side with viem, after the World ID check. Users pay no gas and need no USDC. |
| Post AI score | **Oracle wallet** (Aagneye's server) | Server-side with viem |
| Create challenge (deposit USDC) | **Sponsor** | Desktop web page with a normal wallet (wagmi). Optional in-app version below. |
| Finalize | **Anyone** (we use the relayer) | Server-side |
| Receive payouts | **Users** | Automatic, to the wallet address from `walletAuth` |

So players never call `sendTransaction`. That keeps the Mini App simple and avoids the allowlisting and chain questions.

**Optional, in-app sponsoring with `sendTransaction`.** Documented for World Chain mainnet (`chainId: 480`). Sepolia support isn't stated in the docs, so only try it on mainnet with a small amount:
```ts
import { encodeFunctionData } from "viem";

const { data } = await MiniKit.sendTransaction({
  chainId: 480,
  transactions: [
    { to: USDC, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [CHALLENGE_POOL, amount] }), value: "0x0" },
    { to: CHALLENGE_POOL, data: encodeFunctionData({ abi: challengePoolAbi, functionName: "createChallenge", args: [...] }), value: "0x0" },
  ],
});
// data.userOpHash is NOT the tx hash. Resolve it with useUserOperationReceipt (@worldcoin/minikit-react)
// or GET https://developer.world.org/api/v2/minikit/userop/{userOpHash} -> transaction_hash
```
Both contracts must be on the Developer Portal allowlist.

---

## 4. Two front doors

| URL | Who | Opens in |
|---|---|---|
| `/` and everything under it | Creators, recreators, voters, judges at the booth | World App (Mini App) |
| `/sponsor` | Brands and studios | Desktop browser with MetaMask/Rabby (wagmi) |

Sponsors are companies, not World App users, so a normal web page fits them better.

---

## 5. Testing on a phone

1. Run the app locally: `pnpm dev` (port 3000).
2. Expose it over HTTPS with a tunnel (`ngrok http 3000`; zrok and tunnelmole also work).
3. Put the tunnel URL into the Developer Portal as the app URL.
4. Open `https://worldcoin.org/mini-app?app_id=<MINI_APP_ID>` as a QR code, scan it with the phone camera, and accept the prompt in World App.
5. For logs on the phone, add [Eruda](https://github.com/liriliri/eruda) in development only.
6. Testnet funds for World Chain Sepolia: [l2faucet.com/world](https://www.l2faucet.com/world). The relayer and oracle wallets need a little ETH for gas. Test USDC on Sepolia: `0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88` (6 decimals).

Every teammate needs World App installed. For judges at the booth, print the QR code from step 4.

---

## 6. World Chain details

| | Mainnet | Sepolia (we build on this) |
|---|---|---|
| Chain ID | `480` | `4801` |
| RPC | `https://worldchain-mainnet.g.alchemy.com/public` | `https://worldchain-sepolia.g.alchemy.com/public` |
| Explorer | worldscan.org | worldchain-sepolia.explorer.alchemy.com |
| USDC | check Circle's published address | `0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88` |

---

## 7. Rules from World's guidelines that affect Mudra

| Rule | What we do |
|---|---|
| Chance-based prizes are very unlikely to be approved. Prizes must be for skill. | Winners are decided by AI match score plus human votes. No randomness anywhere. Say "skill-based challenge" in the pitch. |
| Contracts holding funds must be immutable (or upgradable only with a multisig that includes World's team). No owner function may withdraw deposited funds. | `ChallengePool` has **no admin withdraw** and is not upgradable. If a challenge ends with no valid entries, only the sponsor can reclaim their own deposit. |
| Aim for 90%+ test coverage on contracts | Abhimanyu's Foundry tests cover every function and revert. |
| No NSFW or violent content | 0G moderation flags entries before they're shown. |
| Ask before collecting or storing user data; keep data to a minimum | A consent screen before the first capture. We store keypoints and a small thumbnail, not video. |
| Show usernames, not addresses | Use the World App username from `walletAuth`. |
| No "World" in the name, no World logo, no "official" | The app is called Mudra. |
| The app is responsible for legal compliance in each country | Mention it as future work. It doesn't block a hackathon demo. |

---

## 8. Environment variables

```bash
# app/.env.local
NEXT_PUBLIC_APP_ID=app_...               # Mini App app_id
NEXT_PUBLIC_WORLD_ID_APP_ID=app_...      # World ID app_id (can differ from the Mini App one)
RP_ID=rp_...
RP_SIGNING_KEY=...                       # server only
RELAYER_PRIVATE_KEY=0x...                # server only, holds a little ETH on World Chain Sepolia
RPC_URL=https://worldchain-sepolia.g.alchemy.com/public
AI_URL=http://localhost:4000
USE_MOCKS=true
```
