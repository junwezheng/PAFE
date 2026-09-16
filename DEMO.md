# PAFA — demo build

Implementation of the Claude Design handoff in `project/PAFA App.dc.html`: a cashback app that pays
you in the stock of the brand you just bought from, tokenised on Solana.

```
app/       Vite + React + TypeScript demo — all 13 screens
onchain/   Anchor program (vesting escrow) + devnet setup and settlement scripts
project/   the original design bundle, untouched
chats/     the design conversation it came from
```

## Run it

```bash
cd app
npm install
npm run dev          # http://localhost:5173
```

That's the whole setup. With no configuration the app runs **fully offline** in simulated mode:
mock auth, simulated settlement, no network calls. Every screen and the complete hero flow work.

Open it on a phone-width viewport and the bezel drops away and it fills the screen; on desktop it
renders inside an iPhone frame with a Tweaks panel for the economics.

## The hero flow

`Pay → Simulate a scan → Confirm → stock earned → vesting released → Nike benefits → Redeem`

Seeded so the demo lands on the interesting case: September spend starts at **$918.40**, and the
$96.50 Nike purchase crosses the **$1,000** monthly target. That removes vesting for the month and
releases all three pending lots on screen. Before you pay, the Vesting screen shows live per-lot
countdown rings, so both vesting states are reachable in one session.

## Vesting rules

Implemented identically in `app/src/domain/vesting.ts` and `onchain/programs/pafa-vesting/src/lib.rs`:

1. Stock you earn is escrowed and becomes tradable after **14 days**.
2. Spending **$1,000** inside a calendar month drops the hold on every lot earned *that month* —
   released immediately, not at month end.
3. The target resets on the 1st. Months you miss keep the full hold.
4. Vesting never gates benefit unlocks — escrowed stock still counts toward held value, because the
   lot PDA belongs to the user.

Cashback is **3.5%**. Tiers unlock at **$100 / $500 / $1,000** of that brand's stock held.

All three numbers are live in the Tweaks panel and are stored on-chain in the program `Config`.

## Going on-chain

The app has two adapters behind one interface (`app/src/solana/service.ts`), and a status chip
always says which is live, so a demo is never mistaken for a real settlement.

| | Simulated | Devnet |
|---|---|---|
| Auth | local throwaway keypair | Privy embedded Solana wallet |
| Purchase | fake signature | `record_purchase`, treasury-signed |
| Release | fake signature | `release_lot`, user-signed in the browser |

### 1. Deploy the program

Needs the [Solana CLI](https://solana.com/docs/intro/installation) and
[Anchor](https://www.anchor-lang.com/docs/installation) (0.31.1).

```bash
cd onchain
anchor keys sync           # rewrites declare_id! with your own program keypair
anchor build
anchor deploy --provider.cluster devnet
```

### 2. Create the treasury and demo mints

Jupiter and the real Backed xStock mints are **mainnet-only**, so devnet uses stand-in SPL mints that
the treasury holds. The script creates one per brand, opens the program config, and prints the env
lines to paste in.

```bash
cd onchain
npm install
SOLANA_RPC="<your devnet rpc>" PAFA_PROGRAM_ID="<from anchor deploy>" npm run setup:devnet
```

If the airdrop is rate-limited, fund the printed treasury address at
[faucet.solana.com](https://faucet.solana.com) and re-run.

### 3. Run the settlement service

`record_purchase` moves xStock out of the treasury, so it needs the treasury's signature and can
never run in the browser. `onchain/scripts/settle.ts` is the smallest honest version of that service.

```bash
cd onchain
SOLANA_RPC="<your devnet rpc>" PAFA_PROGRAM_ID="<program id>" npm run settle
```

### 4. Point the app at it

Copy `app/.env.example` to `app/.env.local` and fill in `VITE_SOLANA_RPC`, `VITE_PAFA_PROGRAM_ID`,
`VITE_PAFA_TREASURY`, `VITE_XSTOCK_MINTS` and `VITE_PAFA_API`. Add `VITE_PRIVY_APP_ID` from
[dashboard.privy.io](https://dashboard.privy.io) to switch from mock auth to real Privy.

`.env.local` is gitignored — RPC URLs usually carry an API key.

## Tests

```bash
cd onchain && cargo test --lib      # program logic, incl. calendar-month math
cd app && npm run typecheck
cd app && npm run build && npm run preview &
cd app && npm run test:smoke        # 23 checks: drives the whole flow in a browser
```

The smoke test needs a Chromium: `npx playwright install chromium`.

## How the pieces fit

```
app/src/
  domain/      brands, tier ladder, vesting rules, seed data — no UI, no chain
  state/       usePafa.ts — the state machine ported from the prototype's DCLogic
  screens/     one file per screen, styles inline to match the design 1:1
  solana/      program.ts (instruction encoding) + two service adapters
  auth/        Privy, with a mock provider selected at build time
onchain/
  programs/pafa-vesting/src/lib.rs   Config / UserState / VestingLot, 6 instructions
  scripts/                            devnet setup + treasury settlement
```

`app/src/solana/program.ts` encodes Anchor's wire format by hand rather than shipping an IDL, which
keeps `anchor build` off the app's critical path. The discriminators are re-derived at runtime in dev
(`assertDiscriminators`) so they can't silently drift from the program.

## Known gaps

- **Grab has no xStock.** It's a listed company but Backed doesn't issue a token for it, so its
  cashback has nowhere to route. The brand renders everywhere; the mint resolves to `null` and the
  release path says so instead of failing silently. Same for any other symbol without a live mint.
- **xStock mint addresses are never hardcoded.** They're resolved at runtime from
  `VITE_XSTOCK_MINTS` or `public/xstocks.json`. A wrong base58 address would route real value to the
  wrong token, so "none" is the safer default.
- **Swap execution is modelled, not performed.** `record_purchase` takes an already-acquired token
  amount; a production build would CPI into Jupiter inside the same transaction.
- **The settlement service has no auth**, no idempotency key and no rate limiting. It exists to close
  the demo loop, not to be deployed.
