# PAFE — demo build

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

That's the whole setup. With no configuration the app runs in simulated mode: mock auth, simulated
settlement, no wallet and no RPC. Every screen and the complete hero flow work.

Two read-only price feeds are the exception to "no network": the PreStocks listing and Jupiter
quotes. Both fail soft — positions keep their seeded prices and a sale is priced at the mark and
labelled as such — so the demo still works with the network off.

Open it on a phone-width viewport and the bezel drops away and it fills the screen; on desktop it
renders centred inside an iPhone frame.

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

## Two kinds of tokenised stock

| | Listed brands | Private brands |
|---|---|---|
| Issuer | xStocks (Backed Finance) | PreStocks |
| Brands | Apple, Nike, Starbucks, Amazon, Uber, Netflix, McDonald's, Airbnb | OpenAI, Anthropic |
| Mints | `VITE_XSTOCK_MINTS` or `public/xstocks.json` | resolved from the PreStocks API |
| Prices | seeded in the demo | live `tokenPrice` from the API |

Neither issuer's mint addresses are hardcoded — a wrong base58 address routes real value to the
wrong token, so both are resolved at runtime and a symbol that doesn't resolve is reported as such.

PreStocks matters because it covers companies with no listing to tokenise. Paying for ChatGPT Plus
or Claude Pro can pay cashback in OpenAI or Anthropic exposure, which no public equity offers.
`app/src/solana/prestocks.ts` reads their listing for the mint and price, and Jupiter's token list
for decimals (PreStocks doesn't publish them, and guessing the exponent would misprice a trade by
orders of magnitude). Pre-IPO positions are badged **PRE-IPO** everywhere they appear.

The API sends no CORS header, so the browser can't call it directly. `/api/prestocks` is proxied
instead — by `app/vercel.json` in production and Vite's `server`/`preview` proxy locally — which
keeps the app a static build with no server of its own.

## Selling back to USDC

Any holding can be sold for USDC from its brand screen (`app/src/screens/Sell.tsx`).

1. **Only vested stock is sellable.** Escrowed lots sit in the program's lot PDA, so a sale of them
   would fail on-chain; the screen says how much is still vesting instead of offering it.
2. **The amount is editable** — type a share count, or fill it from `50%` / `All`. Entering more
   than the vested balance is refused rather than silently clamped.
3. **The payout is always quoted, never derived from the mark.** On thin pre-IPO pools the issuer's
   mark and the executable price diverge sharply — OpenAI has traded ~50% above mark — so the screen
   shows the fill price, the route, the price impact, and the gap against the mark.
4. **Selling can revoke a perk.** Tiers are unlocked by held value, so the screen names the tier a
   sale drops before you confirm it.

Proceeds land in an in-app USDC balance, shown on the Card screen.

The economics come from `DEFAULT_ECONOMICS` in `app/src/domain/types.ts` and are stored on-chain in
the program `Config`.

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
cd app && npm run test:smoke        # 27 checks: drives the whole flow in a browser
```

The smoke test needs a Chromium: `npx playwright install chromium`.

Run the smoke test against a build made *without* `app/.env.local`. With it present the app takes
the devnet path and posts to the local settlement service, so the receipt reports a failure instead
of the simulated result the assertions expect.

## Deploying the demo

The app is a static SPA — no server and no router, so any static host works. On Vercel: set the
**root directory to `app`**; the build command (`npm run build`) and output directory (`dist`) are
detected automatically, and `app/vercel.json` adds the one rewrite that proxies `/api/prestocks`.

On a host other than Vercel, reproduce that rewrite. Without it the PreStocks fetch fails on CORS,
which is handled — pre-IPO positions just fall back to their seeded prices.

**Do not set any `VITE_*` variables on the host.** Vite inlines them into the client bundle at
build time. With none set the app runs in mock-auth, simulated-settlement mode, which is what a
public demo should do — no wallet, no RPC, no treasury.

`app/.npmrc` pins `legacy-peer-deps=true`. It is required: `@privy-io/react-auth` pulls
`@solana/kit`, `@solana-program/system` and `@solana-program/token` in as optional peers, and their
own peer ranges disagree with the Kit v2 line Privy is built against. Without the flag a clean
`npm ci` fails with `ERESOLVE` and the host build never starts.

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
- **Sells are quoted for real but not submitted.** The route, fill price and impact come from a live
  Jupiter quote, and the liquidity is genuine — OpenAI routes to USDC through Manifest and Meteora
  with real depth. Confirming a sale credits the in-app USDC balance without signing a swap, so no
  tokens move. Wiring it up means requesting the swap transaction from Jupiter and signing it with
  the user's wallet; nothing in the escrow program needs to change, because vested tokens already
  belong to the user.
- **The issuer mark and the market can disagree badly.** Two of the eight PreStocks tokens are far
  from their published `tokenPrice` — OpenAI has quoted ~50% above it and SpaceX ~5x, the latter
  looking more like a stale pool or a share-unit mismatch than a real premium. Holdings are valued
  at the mark and sales at the quote, and the gap is shown rather than hidden. Don't treat either
  number as the fair value of the underlying company without checking the pool.
- **The in-app USDC balance is a number, not an account.** There's no withdrawal path, and it resets
  on reload like the rest of the demo state.
- **The settlement service has no auth**, no idempotency key and no rate limiting. It exists to close
  the demo loop, not to be deployed.
