import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DAY_MS, money, pct, shares as sharesStr, signedPct } from '../lib/format';
import { brandByKey } from '../domain/brands';
import { tierState, type Perk, type Tier } from '../domain/tiers';
import { crossingNote, isReleasable, lotCountdown, sellableShares, vestingView } from '../domain/vesting';
import {
  DEMO_PURCHASE,
  NEARBY,
  SEED_HOLDINGS,
  SEED_SPEND,
  SEED_TRANSACTIONS,
  THIS_MONTH_TX_IDS,
  seedLots,
} from '../domain/mockData';
import { DEFAULT_ECONOMICS, monthKeyOf } from '../domain/types';
import type {
  Economics,
  Holding,
  RedeemDraft,
  Screen,
  SellDraft,
  Transaction,
  VestingLot,
} from '../domain/types';
import { createSolanaService, type PurchaseResult, type SolanaService } from '../solana/service';
import { loadXStocks, xstockFor } from '../solana/xstocks';
import { EMPTY_PRESTOCKS, loadPreStocks, prestockFor, type PreStockRegistry } from '../solana/prestocks';
import { quoteTokenToUsdc, syntheticSellQuote, type SellQuote } from '../solana/jupiter';
import type { XStockToken } from '../domain/types';
import type { PafaWallet } from '../solana/service';
import { useAuth } from '../auth/context';

interface Model {
  screen: Screen;
  stack: Screen[];
  hideBal: boolean;
  spend: number;
  paid: boolean;
  cleared: boolean;
  brandKey: string;
  txId: string | null;
  redeem: RedeemDraft | null;
  sell: SellDraft | null;
  /** USDC proceeds from sales, held in-app until withdrawn. */
  usdc: number;
  holdings: Holding[];
  lots: VestingLot[];
}

const INITIAL_SCREEN: Screen = 'home';

/** Share amounts are edited to 6 decimals, so compare them at that resolution. */
const SHARE_EPSILON = 1e-6;

/** Parsed share amount from field text. 0 for anything unusable. */
function parseShareInput(input: string): number {
  const n = Number(input);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * A share count as editable field text.
 *
 * Rounds *down* to 6 decimals: rounding up would make the "All" button write an
 * amount fractionally larger than the vested balance and fail its own check.
 */
function formatShareInput(shares: number): string {
  if (!(shares > 0)) return '';
  return (Math.floor(shares * 1e6) / 1e6).toFixed(6).replace(/\.?0+$/, '');
}

export function usePafa(econ: Economics = DEFAULT_ECONOMICS) {
  const { wallet } = useAuth();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const animTimer = useRef<number | null>(null);

  const [model, setModel] = useState<Model>(() => ({
    screen: INITIAL_SCREEN,
    stack: [],
    hideBal: false,
    spend: SEED_SPEND,
    paid: false,
    cleared: false,
    brandKey: 'NKE',
    txId: null,
    redeem: null,
    sell: null,
    usdc: 0,
    holdings: SEED_HOLDINGS.map((h) => ({ ...h })),
    lots: seedLots(Date.now(), DEFAULT_ECONOMICS.vestingDays),
  }));

  // Drives the enter animations on progress bars, exactly like the prototype.
  const [anim, setAnim] = useState(false);
  // 1Hz heartbeat so the vesting countdowns tick.
  const [, setTick] = useState(0);

  const [pullY, setPullY] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const pullStart = useRef(0);

  const [service, setService] = useState<SolanaService | null>(null);
  const [registry, setRegistry] = useState<Map<string, XStockToken>>(new Map());
  const [prestocks, setPrestocks] = useState<PreStockRegistry>(EMPTY_PRESTOCKS);
  const [receipt, setReceipt] = useState<PurchaseResult | null>(null);
  const [settling, setSettling] = useState(false);
  const [sellQuote, setSellQuote] = useState<SellQuote | null>(null);
  const [quotingSell, setQuotingSell] = useState(false);

  // ── boot ──────────────────────────────────────────────────
  useEffect(() => {
    const t = window.setTimeout(() => setAnim(true), 120);
    const i = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(i);
    };
  }, []);

  useEffect(() => {
    loadXStocks().then(setRegistry).catch(() => setRegistry(new Map()));
    loadPreStocks().then(setPrestocks).catch(() => setPrestocks(EMPTY_PRESTOCKS));
  }, []);

  // Live PreStocks marks, overlaid on the seeded positions. Kept out of `model`
  // so a price tick can never clobber a share count the user just changed.
  const holdings = useMemo(() => applyLivePrices(model.holdings, prestocks), [model.holdings, prestocks]);

  useEffect(() => {
    let cancelled = false;
    createSolanaService(wallet as PafaWallet | null).then((s) => {
      if (!cancelled) setService(s);
    });
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  // ── navigation ────────────────────────────────────────────
  const go = useCallback((screen: Screen, opts?: { reset?: boolean }) => {
    setModel((m) => ({
      ...m,
      screen,
      stack: opts?.reset ? [] : m.stack.concat([m.screen]),
    }));
    setAnim(false);
    setPullY(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (animTimer.current) window.clearTimeout(animTimer.current);
    animTimer.current = window.setTimeout(() => setAnim(true), 70);
  }, []);

  const back = useCallback(() => {
    setModel((m) => {
      const stack = m.stack.slice();
      const prev = stack.pop() ?? 'home';
      return { ...m, screen: prev, stack };
    });
    setAnim(true);
  }, []);

  useEffect(
    () => () => {
      if (animTimer.current) window.clearTimeout(animTimer.current);
    },
    [],
  );

  // ── pull to refresh ───────────────────────────────────────
  const onPullStart = useCallback(
    (e: React.PointerEvent) => {
      if (model.screen !== 'home') return;
      if (!scrollRef.current || scrollRef.current.scrollTop > 2) return;
      pullStart.current = e.clientY;
      setPulling(true);
    },
    [model.screen],
  );

  const onPullMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pulling) return;
      const dy = e.clientY - pullStart.current;
      if (dy > 0) setPullY(Math.min(78, dy * 0.55));
    },
    [pulling],
  );

  const onPullEnd = useCallback(() => {
    if (!pulling) return;
    const fire = pullY > 44;
    setPulling(false);
    setPullY(fire ? 52 : 0);
    setSpinning(fire);
    if (!fire) return;

    window.setTimeout(() => {
      setPullY(0);
      setSpinning(false);
      setModel((m) => ({
        ...m,
        holdings: m.holdings.map((h) => {
          const d = (Math.random() - 0.42) * 0.9;
          return { ...h, chg: +(h.chg + d).toFixed(2), value: +(h.value * (1 + d / 100)).toFixed(2) };
        }),
      }));
    }, 1100);
  }, [pulling, pullY]);

  // ── the hero flow ─────────────────────────────────────────
  const view = vestingView(model.spend, econ);

  const confirmPay = useCallback(() => {
    const gross = DEMO_PURCHASE.amount;
    const brand = brandByKey(DEMO_PURCHASE.brandKey)!;
    const holding = model.holdings.find((h) => h.key === brand.key)!;
    const earnValue = +((gross * econ.cashbackRate) / 100).toFixed(2);
    const wasWaived = model.spend >= econ.monthlySpendTarget;
    const spendAfter = +(model.spend + gross).toFixed(2);
    const nowWaived = spendAfter >= econ.monthlySpendTarget;
    const justCleared = !wasWaived && nowWaived;
    const releasing = justCleared ? model.lots : [];

    setModel((m) => ({
      ...m,
      spend: spendAfter,
      paid: true,
      cleared: justCleared,
      // Crossing the monthly target releases every lot earned this month.
      lots: nowWaived ? [] : m.lots,
      holdings: m.holdings.map((h) =>
        h.key === brand.key
          ? {
              ...h,
              shares: +(h.shares + earnValue / h.price).toFixed(3),
              value: +(h.value + earnValue).toFixed(2),
            }
          : h,
      ),
    }));
    setReceipt(null);
    go('earned');

    // Settle on-chain in the background — the UI never waits on the network.
    if (!service) return;
    const token = xstockFor(brand.key, registry);
    setSettling(true);
    service
      .recordPurchase({
        brandKey: brand.key,
        ticker: brand.ticker,
        amountUsd: gross,
        cashbackRate: econ.cashbackRate,
        pricePerShare: holding.price,
        token,
      })
      .then(async (result) => {
        setReceipt(result);
        if (releasing.length > 0) {
          await service.releaseLots(
            releasing.map((lot) => ({
              index: lot.index,
              mint: xstockFor(lot.key, registry)?.mint ?? null,
              waiveFirst: true,
            })),
          );
        }
      })
      .catch((err) => console.warn('[pafa] settlement failed', err))
      .finally(() => setSettling(false));
  }, [model.holdings, model.lots, model.spend, econ, go, service, registry]);

  /** Claim a single lot whose time cliff has passed. */
  const claimLot = useCallback(
    (lot: VestingLot) => {
      if (!isReleasable(lot, view, econ)) return;
      setModel((m) => ({ ...m, lots: m.lots.filter((l) => l.index !== lot.index) }));
      service
        ?.releaseLots([{ index: lot.index, mint: xstockFor(lot.key, registry)?.mint ?? null }])
        .catch((err) => console.warn('[pafa] release failed', err));
    },
    [service, registry, view, econ],
  );

  const openBrand = useCallback(
    (key: string) => {
      setModel((m) => ({ ...m, brandKey: key }));
      go('brand');
    },
    [go],
  );

  const openTx = useCallback(
    (id: string) => {
      setModel((m) => ({ ...m, txId: id }));
      go('tx');
    },
    [go],
  );

  const startRedeem = useCallback(
    (holding: Holding, tier: Tier, perk: Perk) => {
      setModel((m) => ({
        ...m,
        redeem: {
          brand: holding.name,
          tier: tier.name,
          title: perk.t,
          note: perk.n,
          req: money(tier.threshold),
          held: money(holding.value),
          code: 'PAFE-' + holding.ticker.slice(0, 3) + '-' + (1000 + Math.floor(Math.random() * 8999)),
        },
      }));
      go('redeem');
    },
    [go],
  );

  // ── sell to USDC ──────────────────────────────────────────
  const vestedOf = useCallback(
    (brandKey: string) => {
      const holding = holdings.find((h) => h.key === brandKey);
      return holding ? sellableShares(brandKey, holding.shares, model.lots) : 0;
    },
    [holdings, model.lots],
  );

  const startSell = useCallback(
    (brandKey: string) => {
      setModel((m) => ({ ...m, sell: { brandKey, input: formatShareInput(vestedOf(brandKey)) } }));
      setSellQuote(null);
      go('sell');
    },
    [go, vestedOf],
  );

  const setSellInput = useCallback((input: string) => {
    // Digits and one decimal point only. Anything else is a typo, not an edit —
    // and an in-progress entry like `0.` has to be allowed through, so the
    // amount is validated from the parsed value rather than the text.
    if (!/^\d*\.?\d*$/.test(input)) return;
    setModel((m) => (m.sell ? { ...m, sell: { ...m.sell, input } } : m));
  }, []);

  /** Fill the amount field from a portion of the vested balance. */
  const setSellPortion = useCallback(
    (portion: number) => {
      const draft = model.sell;
      if (!draft) return;
      const input = formatShareInput(vestedOf(draft.brandKey) * portion);
      setModel((m) => (m.sell ? { ...m, sell: { ...m.sell, input } } : m));
    },
    [model.sell, vestedOf],
  );

  /**
   * Re-quote whenever the draft changes, and abort the previous request so a
   * slow quote for 25% can't land after the user has moved the slider to 100%.
   */
  useEffect(() => {
    const draft = model.sell;
    if (!draft) {
      setSellQuote(null);
      return;
    }
    const holding = holdings.find((h) => h.key === draft.brandKey);
    if (!holding) return;

    // Don't quote an amount we'd refuse to fill: over-selling the vested balance
    // is an error the screen reports, not a trade to price.
    const shares = parseShareInput(draft.input);
    if (shares <= 0 || shares > sellableShares(draft.brandKey, holding.shares, model.lots) + SHARE_EPSILON) {
      setSellQuote(null);
      return;
    }

    const token = prestockFor(draft.brandKey, prestocks) ?? xstockFor(draft.brandKey, registry);
    const controller = new AbortController();
    setQuotingSell(true);

    // No mint or no decimals means no honest quote, so the sale is priced at the
    // displayed mark and labelled as such rather than silently faked as live.
    const atMark = () =>
      syntheticSellQuote({
        inputSymbol: holding.ticker,
        shares,
        pricePerShare: holding.price,
        via: 'priced at mark — no route on this cluster',
      });

    const pending =
      token?.mint && token.decimals != null
        ? quoteTokenToUsdc({
            inputMint: token.mint,
            inputSymbol: token.symbol,
            shares,
            inputDecimals: token.decimals,
            signal: controller.signal,
          }).then((quote) => quote ?? atMark())
        : Promise.resolve(atMark());

    pending
      .then((quote) => {
        if (!controller.signal.aborted) setSellQuote(quote);
      })
      .finally(() => {
        if (!controller.signal.aborted) setQuotingSell(false);
      });

    return () => controller.abort();
  }, [model.sell, model.lots, holdings, prestocks, registry]);

  const confirmSell = useCallback(() => {
    const draft = model.sell;
    if (!draft || !sellQuote) return;
    const { inputShares, outputUsd } = sellQuote;

    setModel((m) => ({
      ...m,
      usdc: +(m.usdc + outputUsd).toFixed(2),
      holdings: m.holdings.map((h) => {
        if (h.key !== draft.brandKey) return h;
        const remaining = Math.max(0, h.shares - inputShares);
        return { ...h, shares: +remaining.toFixed(6), value: +(remaining * h.price).toFixed(2) };
      }),
    }));
    go('sold');
  }, [model.sell, sellQuote, go]);

  const toggleBalance = useCallback(() => setModel((m) => ({ ...m, hideBal: !m.hideBal })), []);

  // ── derived view model ────────────────────────────────────
  const vm = useMemo(
    () =>
      buildViewModel({
        model,
        holdings,
        econ,
        anim,
        view,
        registry,
        prestocks,
        receipt,
        settling,
        service,
        sellQuote,
        quotingSell,
      }),
    [model, holdings, econ, anim, view, registry, prestocks, receipt, settling, service, sellQuote, quotingSell],
  );

  return {
    model,
    vm,
    anim,
    pull: { pullY, pulling, spinning, onPullStart, onPullMove, onPullEnd },
    scrollRef,
    actions: {
      go,
      back,
      confirmPay,
      claimLot,
      openBrand,
      openTx,
      startRedeem,
      startSell,
      setSellInput,
      setSellPortion,
      confirmSell,
      toggleBalance,
    },
  };
}

export type PafaController = ReturnType<typeof usePafa>;
export type PafaViewModel = ReturnType<typeof buildViewModel>;

// ─────────────────────────────────────────────────────────────
// View model — mirrors the prototype's renderVals()
// ─────────────────────────────────────────────────────────────

/**
 * Overlay live PreStocks marks on the seeded positions.
 *
 * Only `price` and `value` move. The API publishes no 24h change, so `chg`
 * keeps its seeded value rather than displaying a number we invented.
 */
function applyLivePrices(holdings: Holding[], prestocks: PreStockRegistry): Holding[] {
  if (!prestocks.live) return holdings;
  return holdings.map((h) => {
    const price = prestockFor(h.key, prestocks)?.tokenPrice;
    if (!price) return h;
    return { ...h, price, value: +(h.shares * price).toFixed(2) };
  });
}

function buildViewModel(args: {
  model: Model;
  holdings: Holding[];
  econ: Economics;
  anim: boolean;
  view: ReturnType<typeof vestingView>;
  registry: Map<string, XStockToken>;
  prestocks: PreStockRegistry;
  receipt: PurchaseResult | null;
  settling: boolean;
  service: SolanaService | null;
  sellQuote: SellQuote | null;
  quotingSell: boolean;
}) {
  const { model, econ, anim, view, registry, prestocks, receipt, settling, service, sellQuote, quotingSell } = args;
  const now = Date.now();

  const holdings = args.holdings.slice().sort((a, b) => b.value - a.value);
  const total = holdings.reduce((sum, h) => sum + h.value, 0);
  const pendingValue = model.lots.reduce((sum, l) => sum + l.value, 0);
  const waived = view.waived;
  const monthName = view.monthName;

  const decorate = (h: Holding) => {
    const ts = tierState(h);
    return {
      ...h,
      valueStr: money(h.value),
      sharesStr: sharesStr(h.shares, h.ticker),
      priceStr: money(h.price),
      chgStr: signedPct(h.chg),
      chgColor: h.chg >= 0 ? '#14F195' : '#FF6B8A',
      tierPct: ts.pct,
      tierNote: ts.nextNote,
      tierName: ts.tierName,
      xstock: xstockFor(h.key, registry),
      prestock: prestockFor(h.key, prestocks),
    };
  };

  const transactions: Transaction[] = SEED_TRANSACTIONS.filter((t) => t.id !== 'tx-nke' || model.paid).map((t) => {
    const isCurrentPurchase = t.id === 'tx-nke' && model.paid;
    return {
      ...t,
      // Use the actual settlement receipt for the purchase made in this session.
      signature: isCurrentPurchase ? receipt?.signature ?? undefined : t.signature,
      onChain: isCurrentPurchase ? receipt?.onChain ?? false : t.onChain,
      // This month's earnings follow the waiver; older ones already vested.
      status: THIS_MONTH_TX_IDS.has(t.id) ? (waived ? 'Vested' : 'Vesting') : 'Vested',
    };
  });

  const decorateTx = (t: Transaction) => ({
    ...t,
    amountStr: '−' + money(t.amount),
    earnStr: '+' + t.fill,
    earnColor: t.status === 'Vested' ? '#14F195' : '#FFB84D',
    statusColor: t.status === 'Vested' ? '#14F195' : '#FFB84D',
    transferPending: t.id === 'tx-nke' && model.paid && settling && !receipt,
  });

  const allTx = transactions.map(decorateTx);
  const activeTx = allTx.find((t) => t.id === model.txId) ?? allTx[0];

  const brandHolding = holdings.find((h) => h.key === model.brandKey) ?? holdings[0];
  const brandTs = tierState(brandHolding);
  const brandTiers = brandTs.tiers.map((tier, i) => {
    const unlocked = i <= brandTs.idx;
    return {
      tier,
      name: tier.name,
      bg: unlocked ? 'linear-gradient(140deg,rgba(0,255,163,.09),rgba(153,69,255,.10))' : '#0B0B12',
      border: unlocked ? 'rgba(20,241,149,.28)' : 'rgba(255,255,255,.07)',
      dot: unlocked ? '#14F195' : 'rgba(255,255,255,.16)',
      titleColor: unlocked ? '#FFFFFF' : '#C7C7D6',
      pillText: unlocked ? 'Unlocked' : money(tier.threshold) + ' held',
      pillBg: unlocked ? 'rgba(20,241,149,.16)' : 'rgba(255,255,255,.06)',
      pillColor: unlocked ? '#14F195' : '#8D8DA6',
      locked: !unlocked,
      gapNote: money(Math.max(0, tier.threshold - brandHolding.value)) + ' more of ' + brandHolding.ticker + ' to unlock',
      perks: tier.perks.map((p) => ({
        perk: p,
        title: p.t,
        note: p.n,
        color: unlocked ? '#F2F2F7' : '#8D8DA6',
        tick: unlocked ? '#14F195' : 'rgba(255,255,255,.18)',
        canRedeem: unlocked,
      })),
    };
  });

  const unlockedPerks: {
    mono: string;
    title: string;
    brand: string;
    tier: string;
    state: string;
    key: string;
  }[] = [];
  const nearPerks: {
    mono: string;
    title: string;
    brand: string;
    tier: string;
    gap: string;
    pct: string;
    key: string;
  }[] = [];

  holdings.forEach((h) => {
    const ts = tierState(h);
    ts.tiers.forEach((tier, i) => {
      if (i <= ts.idx) {
        if (unlockedPerks.length < 5) {
          unlockedPerks.push({
            mono: h.mono,
            title: tier.perks[0].t,
            brand: h.name,
            tier: tier.name.split(' · ')[1],
            state: 'Active',
            key: h.key,
          });
        }
      } else if (tier === ts.next && nearPerks.length < 4) {
        const floor = i === 0 ? 0 : ts.tiers[i - 1].threshold;
        nearPerks.push({
          mono: h.mono,
          title: tier.perks[0].t,
          brand: h.name,
          tier: tier.name.split(' · ')[1],
          gap: money(tier.threshold - h.value) + ' away',
          pct: anim ? pct(((h.value - floor) / (tier.threshold - floor)) * 100) : '0%',
          key: h.key,
        });
      }
    });
  });

  const RING_C = 2 * Math.PI * 27;
  const lots = model.lots.map((lot) => {
    const { progress, label } = lotCountdown(lot, econ, now);
    return {
      lot,
      mono: lot.mono,
      name: lot.name,
      valueStr: money(lot.value),
      sharesStr: sharesStr(lot.shares, lot.key),
      earned: new Date(lot.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dash: (RING_C * progress).toFixed(1) + ' ' + RING_C.toFixed(1),
      ringColor: progress > 0.7 ? '#14F195' : '#9945FF',
      countdown: label,
      countColor: progress > 0.7 ? '#14F195' : '#C4A6FF',
      releasable: isReleasable(lot, view, econ, now),
    };
  });

  const nikeHolding = holdings.find((h) => h.key === 'NKE')!;
  const nikeTs = tierState(nikeHolding);
  const EARNED_RING_C = 2 * Math.PI * 50;

  const gross = DEMO_PURCHASE.amount;
  const earnValue = (gross * econ.cashbackRate) / 100;
  const earnSharesNum = earnValue / nikeHolding.price;
  const spendAfter = model.spend + (model.paid ? 0 : gross);

  // ── sell ──────────────────────────────────────────────────
  const draft = model.sell;
  const sellHolding = draft ? holdings.find((h) => h.key === draft.brandKey) : undefined;
  const sellTicker = sellHolding?.ticker ?? '';
  const sellable = sellHolding ? sellableShares(sellHolding.key, sellHolding.shares, model.lots) : 0;
  const sellInput = draft?.input ?? '';
  const sellShares = parseShareInput(sellInput);
  const overSelling = sellShares > sellable + SHARE_EPSILON;
  const sellError = overSelling ? `Only ${sharesStr(sellable, sellTicker)} is vested` : null;
  const lockedShares = sellHolding ? sellHolding.shares - sellable : 0;
  const sellMark = sellHolding?.price ?? 0;
  const nearly = (a: number, b: number) => Math.abs(a - b) <= SHARE_EPSILON;

  // Tiers are unlocked by held value, so a sale can silently revoke a perk.
  // Work out the tier on the far side of the trade and warn before it happens.
  const tierBefore = sellHolding ? tierState(sellHolding) : null;
  const valueAfterSell = Math.max(0, (sellHolding?.value ?? 0) - sellShares * sellMark);
  const tierAfter = sellHolding ? tierState({ key: sellHolding.key, value: valueAfterSell }) : null;
  const losesTier = !!tierBefore && !!tierAfter && tierAfter.idx < tierBefore.idx;

  // The issuer's mark and the executable price diverge on thin pre-IPO pools.
  // Surface the gap instead of letting the payout look like a rounding bug.
  const markGapPct =
    sellQuote && sellMark > 0 ? ((sellQuote.pricePerShare - sellMark) / sellMark) * 100 : 0;

  const titles: Record<Screen, string> = {
    home: 'PAFE',
    stocks: 'Stocks',
    pay: 'Pay',
    review: 'Confirm',
    earned: 'Earned',
    brand: brandHolding.name,
    redeem: 'Redeem',
    redeemed: 'Redeemed',
    sell: 'Sell',
    sold: 'Sold',
    vesting: 'Vesting',
    benefits: 'Perks',
    card: 'Card',
    activity: 'Activity',
    tx: 'Transaction',
  };

  const S = model.screen;
  const rootish = S === 'home' || S === 'stocks' || S === 'pay' || S === 'benefits' || S === 'card';

  return {
    screen: S,
    title: titles[S],
    canBack: !rootish,
    showAvatar: rootish,

    // portfolio
    balanceStr: model.hideBal ? '••••••' : money(total),
    dayChangeStr: '+' + money(total * 0.0108) + ' (1.08%) today',
    vestedStr: money(total - pendingValue),
    pendingStr: money(pendingValue),
    pendingNote: model.lots.length ? model.lots.length + ' lots vesting' : 'Nothing locked',
    holdingCount: holdings.length,
    topHoldings: holdings.slice(0, 4).map(decorate),
    allHoldings: holdings.map(decorate),
    hasPending: model.lots.length > 0,

    // transactions
    recentTx: allTx.slice(0, 3),
    allTx,
    tx: activeTx,

    // vesting
    waived,
    vestTitle: waived ? `${monthName} vesting removed` : `${monthName} vesting · ${econ.vestingDays} days`,
    vestSub: waived
      ? `You hit ${money(econ.monthlySpendTarget)} this month, so all ${monthName} stock is unlocked and new purchases settle instantly.`
      : `${money(view.remaining)} more in ${monthName} removes vesting on this month’s stock.`,
    vestLong: waived
      ? `${monthName} spend passed ${money(econ.monthlySpendTarget)}. Every stock earned this month released early, and anything you earn before the 1st settles instantly.`
      : `Stock you earn is held for ${econ.vestingDays} days. Spend ${money(econ.monthlySpendTarget)} inside ${monthName} and the hold is dropped on every stock earned this month.`,
    vestBannerBg: waived
      ? 'linear-gradient(140deg,rgba(0,255,163,.13),rgba(3,225,255,.08))'
      : 'linear-gradient(140deg,rgba(153,69,255,.14),rgba(255,184,77,.07))',
    vestBannerBorder: waived ? 'rgba(20,241,149,.3)' : 'rgba(153,69,255,.28)',
    spendPct: pct(view.progress),
    spendStr: money(model.spend),
    thresholdStr: money(econ.monthlySpendTarget),
    vestDaysStr: String(econ.vestingDays),
    monthName,
    lotsTitle: model.lots.length ? 'Vesting now' : 'Nothing vesting',
    lots,

    // pay / review
    rateStr: econ.cashbackRate + '% in stock',
    earnShares: earnSharesNum.toFixed(3),
    earnValue: money(earnValue),
    vestPillText: waived ? 'Instant' : `${econ.vestingDays}-day hold`,
    vestPillColor: waived ? '#14F195' : '#FFB84D',
    spendAfterStr: money(spendAfter),
    crossNote: crossingNote(model.spend + gross, econ, waived, monthName),
    nearby: NEARBY,
    nikePrice: money(nikeHolding.price),

    // earned
    earnedRingDash: waived
      ? `${EARNED_RING_C.toFixed(1)} ${EARNED_RING_C.toFixed(1)}`
      : `${(EARNED_RING_C * 0.04).toFixed(1)} ${EARNED_RING_C.toFixed(1)}`,
    earnedRingLabel: waived ? 'settled' : `${econ.vestingDays}d left`,
    earnedVestTitle: model.cleared
      ? `${monthName} vesting removed`
      : waived
        ? 'Settled instantly'
        : `Vesting for ${econ.vestingDays} days`,
    earnedVestBody: model.cleared
      ? `${monthName} spend passed ${money(econ.monthlySpendTarget)}. Every lot earned this month released, and the rest of ${monthName} settles the moment you pay.`
      : waived
        ? `${monthName} is already past ${money(econ.monthlySpendTarget)} of spend, so this stock is yours to hold or sell right away.`
        : `This lot becomes tradable in ${econ.vestingDays} days. It already counts toward Nike benefit unlocks.`,
    earnedCardBg:
      model.cleared || waived
        ? 'linear-gradient(140deg,rgba(0,255,163,.14),rgba(3,225,255,.08))'
        : 'linear-gradient(140deg,rgba(153,69,255,.14),rgba(255,184,77,.07))',
    earnedCardBorder: model.cleared || waived ? 'rgba(20,241,149,.32)' : 'rgba(153,69,255,.28)',
    justCleared: model.cleared,
    releasedLots: [
      { label: 'Nike · $8.42' },
      { label: 'Starbucks · $3.90' },
      { label: 'Grab · $1.05' },
    ],
    nikeTierName: nikeTs.tierName,
    nikeProgW: anim ? nikeTs.pct : '0%',
    nikeProgNote: nikeTs.nextNote === 'Top tier' ? 'Top tier reached' : nikeTs.nextNote + ' of Nike stock',

    // brand
    brand: {
      ...decorate(brandHolding),
      sharesStr: sharesStr(brandHolding.shares, brandHolding.ticker) + ' held',
      nextNote: brandTs.nextNote,
    },
    brandHolding,
    brandProgW: anim ? brandTs.pct : '0%',
    brandTiers,

    // perks
    unlockedPerks,
    nearPerks,
    activeCount: String(unlockedPerks.length),

    // redeem
    redeem: model.redeem ?? { brand: '', tier: '', title: '', note: '', req: '', held: '', code: '' },

    // sell
    usdcStr: money(model.usdc),
    hasUsdc: model.usdc > 0,
    sell: {
      name: sellHolding?.name ?? '',
      mono: sellHolding?.mono ?? '',
      ticker: sellTicker,
      input: sellInput,
      halfActive: sellable > 0 && nearly(sellShares, Math.floor((sellable / 2) * 1e6) / 1e6),
      allActive: sellable > 0 && nearly(sellShares, Math.floor(sellable * 1e6) / 1e6),
      error: sellError,
      preIpo: !!sellHolding && !!prestockFor(sellHolding.key, prestocks),
      tokenSymbol: sellQuote?.inputSymbol ?? sellTicker,
      sellableStr: sharesStr(sellable, sellTicker),
      sharesStr: sharesStr(sellShares, sellTicker),
      lockedStr: lockedShares > 0.0005 ? sharesStr(lockedShares, sellTicker) : null,
      markStr: money(sellMark),
      quoting: quotingSell,
      canSell: sellShares > 0 && !overSelling && !!sellQuote && !quotingSell,
      nothingToSell: sellable <= 0,
      proceedsStr: sellQuote ? money(sellQuote.outputUsd) : '—',
      fillStr: sellQuote ? money(sellQuote.pricePerShare) : '—',
      via: sellQuote?.via ?? 'quoting…',
      live: sellQuote?.live ?? false,
      routeColor: sellQuote?.live ? '#14F195' : '#FFB84D',
      impactStr:
        sellQuote?.priceImpactPct != null ? pct(Math.abs(sellQuote.priceImpactPct) * 100) : null,
      markGapStr: Math.abs(markGapPct) >= 1 ? signedPct(markGapPct) : null,
      valueAfterStr: money(valueAfterSell),
      tierWarning: losesTier && tierBefore ? `Drops you out of ${tierBefore.tierName}` : null,
    },

    // chain
    chainMode: service?.mode ?? 'simulated',
    chainLabel: service?.describe() ?? 'connecting…',
    receipt,
    settling,
    monthKey: monthKeyOf(now),
    dayMs: DAY_MS,
  };
}
