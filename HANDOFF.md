# Handoff — PAFA demo, continuing the test pass

You're picking up a demo app built from a Claude Design handoff (`project/PAFA App.dc.html`).
Everything below is current as of this commit. Read `DEMO.md` first for what the product does and
how the pieces fit; this file is only about **what has and hasn't been verified**, so you know where
to point your effort.

## Start here

```bash
cd app && npm install && npm run dev      # http://localhost:5173
```

No configuration needed. With no env vars the app runs fully offline: mock auth, simulated
settlement, zero network calls. Every screen works, and so does the whole hero flow.

## Already verified — don't redo this

| Check | Command | Result |
|---|---|---|
| Program logic, incl. calendar-month math | `cd onchain && cargo test --lib` | 5/5 pass |
| Program compiles | `cd onchain && cargo check --lib` | clean (warnings only, all from Anchor's own macros) |
| Types, app | `cd app && npm run typecheck` | clean |
| Types, scripts | `cd onchain && npx tsc --noEmit` | clean |
| Production build | `cd app && npm run build` | clean |
| End-to-end browser flow | `cd app && npm run build && npm run preview` then `npm run test:smoke` | 24/24 pass |

`app/tests/smoke.mjs` drives login → vesting countdowns → pay → confirm → earned → brand tiers →
redeem → every remaining screen → the Tweaks sliders. It needs a Chromium:
`npx playwright install chromium`. Playwright is pinned to 1.56.1 deliberately — a floating range
picked a version whose expected browser build didn't match what was installed.

## Not verified — this is where the real work is

**Nothing on-chain has ever executed.** The sandbox this was built in blocks outbound Solana RPC and
Jupiter at the network-policy level (403 at the proxy's CONNECT, before reaching the host), so the
devnet path is written, typechecked and reviewed but has never run against a cluster. Treat all of
the following as unproven:

1. **`anchor build` and deploy.** The program only ever went through `cargo check`/`cargo test` on
   the host target — it has never been compiled to SBF. Expect to fix toolchain-version friction
   before anything deploys. Anchor 0.31.1 is what the code targets.
2. **Every instruction, end to end.** `initialize_config`, `init_user`, `record_purchase`,
   `waive_lot`, `release_lot`. Worth writing real Anchor integration tests against a local validator
   (`anchor test`) before bothering with devnet — faster loop, and `solana-test-validator` lets you
   warp the clock to exercise the 14-day cliff, which you can't do on devnet.
3. **The hand-rolled instruction encoding** in `app/src/solana/program.ts`. This is the highest-risk
   file. It encodes Anchor's wire format directly instead of using a generated IDL: discriminators,
   argument order, and — most importantly — **account-meta order, which must match the field order
   of each `#[derive(Accounts)]` struct exactly**. A mismatch fails at runtime, not compile time.
   `assertDiscriminators()` runs in dev and catches stale discriminators, but nothing checks meta
   order. If you'd rather not carry that risk: run `anchor build`, then swap in
   `@coral-xyz/anchor` with the generated IDL from `onchain/target/idl/pafa_vesting.json`. That's a
   legitimate simplification, not a regression.
4. **Privy.** The SDK is wired against the real API (`useSolanaWallets`, `useSignTransaction` from
   `@privy-io/react-auth/solana`, embedded Solana wallet created on login), but with no app id set
   it has never actually run. Set `VITE_PRIVY_APP_ID` and the mock provider is bypassed entirely.
5. **Jupiter quotes.** Mainnet-only, so devnet always takes the synthetic-price path. The live-quote
   branch in `app/src/solana/jupiter.ts` is unexercised.

## Things that will bite you

- **`app/.env.local` is gitignored and did not travel with this repo.** Copy `app/.env.example` and
  fill it in. The devnet RPC URL in particular carries an API key — keep it out of commits.
- **Devnet has no Jupiter and no real xStock mints.** `onchain/scripts/setup-devnet.ts` creates
  stand-in SPL mints held by the treasury. The swap is modelled, not performed.
- **`record_purchase` cannot be signed in the browser** — it moves tokens out of the treasury. It
  goes through `onchain/scripts/settle.ts`. Only `release_lot` / `waive_lot` are user-signed
  client-side. This split is intentional; don't "fix" it by putting a treasury key in the frontend.
- **Grab has no xStock**, so its mint resolves to `null` and the release path reports that rather
  than failing silently. That's expected behaviour, not a bug to close.
- **xStock mint addresses are never hardcoded** anywhere, by design. They come from
  `VITE_XSTOCK_MINTS` or `public/xstocks.json` at runtime. If you add mainnet mints, verify each
  address against Backed's own published list — a wrong base58 address routes value to the wrong
  token.
- **Two copies of the vesting rules**, in `app/src/domain/vesting.ts` and
  `onchain/programs/pafa-vesting/src/lib.rs`. They're deliberately kept in step. Change one, change
  the other, or the UI will lie about what the chain will do.
- **The Tweaks panel changes `vestingDays` at runtime**, which is why countdowns derive from
  `earnedAt + vestingDays` rather than the stored `unlockAt` (see `effectiveUnlockAt`). There's a
  regression check for this in the smoke test — a negative `stroke-dasharray` was the original
  symptom.

## Suggested order

1. `anchor build` → `anchor test` against a local validator. Get instruction-level coverage there,
   including a clock-warp test for the 14-day cliff and one for the month-rollover waiver reset.
2. Deploy to devnet, run `setup:devnet`, run `settle`, then drive the app's hero flow and confirm a
   real signature lands in the receipt card on the Earned screen.
3. Add a Privy app id and confirm the embedded wallet signs `release_lot`.
4. Extend `app/tests/smoke.mjs` to cover the on-chain path once it's real — it currently asserts
   `Not settled`, which will need to become a signature assertion.

## Deliberate deviation from the design

The iOS status bar paints above the app header. In the original prototype the header (z-30) covered
it with a 96%-opaque scrim, hiding the clock — clearly unintended, since the header reserves exactly
58px of top padding for it. Everything else is a faithful port. If you're diffing against
`project/PAFA App.dc.html` and see that, it's intentional.
