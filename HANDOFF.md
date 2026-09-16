# Handoff — PAFE demo, continuing the test pass

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
| Program compiles (host) | `cd onchain && cargo check --lib` | clean (warnings only, all from Anchor's own macros) |
| Program compiles to SBF | `cd onchain && anchor build` | clean (same Anchor macro warnings) |
| Instruction coverage, incl. 14-day cliff + month-rollover | `cd onchain && anchor test` | 14/14 pass |
| Hand-rolled encoding in `program.ts` | same `anchor test` suite | discriminators, meta flags, and every instruction against the .so |
| Types, app | `cd app && npm run typecheck` | clean |
| Types, scripts + tests | `cd onchain && npx tsc --noEmit` | clean |
| Production build | `cd app && npm run build` | clean (see the peer-dep note below) |
| End-to-end browser flow | `cd app && npm run build && npm run preview` then `npm run test:smoke` | 22/22 pass |

`app/tests/smoke.mjs` drives login → vesting countdowns → pay → confirm → earned → brand tiers →
redeem → every remaining screen. It needs a Chromium: `npx playwright install chromium`. Playwright
is pinned to 1.56.1 deliberately — a floating range picked a version whose expected browser build
didn't match what was installed.

Run it against a build made *without* `app/.env.local`, which is also how a host builds it. With
that file present the app takes the devnet path and the receipt reports a settlement failure rather
than the simulated result the assertions expect.

The on-chain suite is `onchain/tests/pafa-vesting.test.ts`. It sends the builders in
`app/src/solana/program.ts` at the compiled `.so` inside LiteSVM. `solana-test-validator` has no
RPC to overwrite `Clock.unix_timestamp`, so the 14-day cliff and the Oct-1 waiver reset are warped
in-process; `anchor test` still builds, deploys to a local validator, then runs that suite.

## Not verified — this is where the real work is

Local execution is proven. Nothing has been sent to a public cluster, and the two live services
have never been configured:

1. **Devnet deploy.** `anchor deploy --provider.cluster devnet`, then `setup:devnet` and `settle`.
   `app/.env.local` is gitignored and did not travel with this repo — copy `app/.env.example`.
2. **Privy.** The SDK is wired against the real API (`useSolanaWallets`, `useSignTransaction` from
   `@privy-io/react-auth/solana`, embedded Solana wallet created on login), but with no app id set
   it has never actually run. Set `VITE_PRIVY_APP_ID` and the mock provider is bypassed entirely.
3. **Jupiter quotes.** Mainnet-only, so devnet always takes the synthetic-price path. The live-quote
   branch in `app/src/solana/jupiter.ts` is unexercised.

## Things that will bite you

- **`anchor keys sync` rewrote `declare_id!`.** It is now `6NHpvq6rD1xrCAxdcV4wu9BH3tBCvZD12qHs5PTyisDj`, matching the keypair in `target/deploy/` (gitignored). After a fresh clone, run `anchor keys sync` before `anchor build` or the validator deploy will disagree with `declare_id!`. LiteSVM tests load the `.so` at the IDL address, so they still pass without the keypair.
- **SBF Cargo is 1.84** (platform-tools v1.51). Several crates have since shipped edition2024 manifests that that Cargo cannot parse. The lockfile is pinned; don't `cargo update` without re-running `anchor build`. Pins and rationale are in `onchain/Cargo.toml`.
- **Anchor CLI is 0.32.1, crate is 0.31.1.** Build and test work. AVM cannot install 0.31.1 on this machine, so `Anchor.toml` pins the CLI at 0.32.1 to stop it retrying. Expect a version-mismatch warning on every `anchor` invocation.
- **Cursor sets `CARGO_TARGET_DIR` to a sandbox cache.** `anchor test` then drops the `.so` somewhere `target/deploy/` isn't. Point it at the workspace: `CARGO_TARGET_DIR="$(pwd)/target" anchor test`.
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
- **Countdowns derive from `earnedAt + vestingDays`**, not the stored `unlockAt` (see
  `effectiveUnlockAt`). The Tweaks panel used to change `vestingDays` at runtime and a shorter
  period drove ring progress negative, producing an invalid `stroke-dasharray`. The panel is gone
  and the economics are now fixed at `DEFAULT_ECONOMICS`, but keep the derivation — it's what makes
  the geometry safe if the values ever become adjustable again.
- **`app/.npmrc` sets `legacy-peer-deps=true`, and the build needs it.**
  `@privy-io/react-auth` imports `getTransactionDecoder`, `getTransferSolInstruction` and
  `findAssociatedTokenPda` from `@solana/kit`, `@solana-program/system` and `@solana-program/token`.
  Those are optional peers, so they aren't installed transitively, and Rollup fails to link the
  Privy chunk without them. They're pinned to the Kit v2 line Privy targets
  (`kit@2.3.0`, `system@0.7.0`, `token@0.5.0`); the current majors want Kit v8 and npm's strict
  peer check rejects the tree, hence the flag. Don't bump them without re-running `npm run build`.

## Suggested order

1. Deploy to devnet, run `setup:devnet`, run `settle`, then drive the app's hero flow and confirm a
   real signature lands in the receipt card on the Earned screen.
2. Add a Privy app id and confirm the embedded wallet signs `release_lot`.
3. Extend `app/tests/smoke.mjs` to cover the on-chain path once it's real — it currently asserts
   `Not settled`, which will need to become a signature assertion.

## Deliberate deviation from the design

The iOS status bar paints above the app header. In the original prototype the header (z-30) covered
it with a 96%-opaque scrim, hiding the clock — clearly unintended, since the header reserves exactly
58px of top padding for it. Everything else is a faithful port. If you're diffing against
`project/PAFA App.dc.html` and see that, it's intentional.
