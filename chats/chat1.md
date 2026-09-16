# PAFA Cashback Stock App

_Started 2026-09-16 03:03 UTC_

---

## User

Design a mobile app for PAFA, a cashback app where people earn stocks for each of their purchase through our app.

Each stock in PAFA, once they hit a certain amount they can unlock different benefits from that brand.

Once they hit a certain spending their vesting period is no more. Else new user vesting is 14 days.

using Solana as the color palatte for the app. The app images use it as base to build on and add more features.

## Assistant



## Assistant

_[tool: list_files]_

_[tool: view_image]_

The attached design system only contains the Overheat mark, so I'll build on the Solana palette + your reference screenshots. A few calls before I start:

_[tool: ask_user]_

Form's up — waiting on your answers (screens, stock/unlock model, vesting treatment, brands). Skip anything and I'll pick a sensible default.

## User

Answered — Asked for follow-up questions; screens: Home / dashboard, Stock portfolio, Brand detail (tiers + benefits), Benefits hub, Card & pay, Transaction detail (stock earned), Vesting status screen, Redeem a benefit flow, Activity / history; core_metaphor: Portfolio value of stocks earned; stock_model: Fractional shares (0.42 AAPL); unlock_model: Hold $X value of the brand → unlock; vesting_ui: Countdown ring on each pending stock; payment: In-app QR / PayNow style; fidelity: One polished flow; interactions: Tap brand → detail sheet, Progress bar animating to next tier, Redeem benefit con…

## Assistant



## Assistant

_[tool: ask_user]_

Round two is up — market, brand mix, the spine flow, and thresholds. Once you submit I'll build.

## User

Answered — market: Global mix; brand_mix: Grab, Apple, Nike, Starbucks, Netflix, Uber, Amazon, McDonald's, Airbnb; hero_flow: Pay by QR → stock earned → vesting ring → brand detail → redeem; unlock_thresholds: $100 / $500 / $1,000; spend_threshold: $500 lifetime spend removes vesting; vesting_state: Show both; benefit_kinds: % discount, Free delivery, Early access to drops, Members-only products, Free item monthly, Lounge / venue access

## Assistant

_[tool: copy_starter_component]_

_[tool: grep]_

Design system is essentially empty (just the Overheat mark), so I'll build on the Solana palette directly. Building the flow now.

_[tool: dc_write]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

PAFA is up as one interactive prototype — Solana palette on near-black, Sora + Hanken Grotesk.

The spine: **Pay → Simulate a scan → Confirm → stock earned**. That $96.50 purchase crosses the $500 lifetime-spend threshold, so vesting is removed permanently and the three pending lots release on screen — then **See Nike benefits** → tier progress animates → **Redeem** → member code. Before you pay, the Vesting screen shows live per-lot countdown rings, so both vesting states are reachable.

Also built: Home (hidable balance, pull-to-refresh that re-prices holdings), Stocks with vested/vesting split, Perks (unlocked vs. close-to-unlocking), Card, Activity, and transaction detail.

Tweaks panel exposes cashback rate, spend threshold, and vesting days. Brand marks are lettered placeholders — send real logos and I'll swap them in.

## User

update the vesting to be per month need spend 1000 to remove vesting for the stocks earn that month.

The stocks they earn is 3.5%

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Now the logic and the rate:

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now the remaining copy on the earned/confirm screens:

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_set_props]_

_[tool: ready_for_verification]_

Vesting is now monthly: $1,000 spend inside a calendar month drops the 14-day hold on every stock earned that month, and the target resets on the 1st. Cashback is 3.5%.

Demo starts at $918.40 spent in September, so the $96.50 Nike payment crosses $1,000 and releases September's three vesting lots. Tweaks now expose cashback rate, monthly target, and vesting days.

## User

how should I export this such that my agent can build this app, into a demo

