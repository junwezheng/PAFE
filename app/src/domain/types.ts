/** Core domain types for the PAFA demo. */

/** A brand you can pay at, and the tokenised equity its cashback is paid in. */
export interface Brand {
  /** Stable key used across the app (matches the underlying equity ticker). */
  key: string;
  name: string;
  /** Two-letter placeholder mark — the design uses lettered tiles, not logos. */
  mono: string;
  /** Underlying equity ticker, e.g. `NKE`. */
  ticker: string;
  /**
   * The xStocks (Backed Finance) symbol we'd route into, e.g. `NKEx`.
   * `null` when the brand is not a listed public equity we can tokenise —
   * either a private company (see `prestockSymbol`) or a listing Backed
   * doesn't issue a token for, in which case cashback falls back to a basket.
   */
  xstockSymbol: string | null;
  /**
   * The PreStocks symbol for private companies, e.g. `OPENAI`. Mutually
   * exclusive with `xstockSymbol`: a company is either listed or it isn't.
   */
  prestockSymbol?: string;
}

/** Live listing status for an xStock, resolved at runtime from a token list. */
export type ListingStatus = 'live' | 'unlisted' | 'unknown';

/** An xStock mint as resolved for the currently selected cluster. */
export interface XStockToken {
  symbol: string;
  /** Base58 mint address. Null until resolved from a token list / devnet setup. */
  mint: string | null;
  decimals: number;
  status: ListingStatus;
}

/**
 * A PreStocks token — tokenised pre-IPO equity, resolved from their API.
 *
 * `decimals` comes from Jupiter's token list rather than the PreStocks API,
 * which doesn't publish it. It stays `null` until resolved, and a sale without
 * it is priced synthetically instead of quoted: guessing the exponent would
 * misquote the trade by orders of magnitude.
 */
export interface PreStockToken {
  symbol: string;
  /** Base58 SPL mint from the API. Null when the symbol didn't resolve. */
  mint: string | null;
  /** USD per token, the issuer's `tokenPrice`. Null when unresolved. */
  tokenPrice: number | null;
  decimals: number | null;
  status: ListingStatus;
}

/** A position in the user's portfolio. */
export interface Holding {
  key: string;
  name: string;
  ticker: string;
  mono: string;
  /** Fractional share count. */
  shares: number;
  /** Price per share, USD. */
  price: number;
  /** Market value, USD. */
  value: number;
  /** Day change, percent. */
  chg: number;
}

/** A parcel of stock earned from one purchase, subject to vesting. */
export interface VestingLot {
  /** On-chain lot index (PDA seed). Also the React key. */
  index: number;
  key: string;
  name: string;
  mono: string;
  shares: number;
  /** USD value at the moment it was earned. */
  value: number;
  /** Epoch millis. */
  earnedAt: number;
  /** Epoch millis — `earnedAt + vestingDays`. */
  unlockAt: number;
  /** `year * 12 + month` — the waiver only frees lots from its own month. */
  monthKey: number;
  released: boolean;
  /** Devnet signature for the escrow transfer, when on-chain. */
  signature?: string;
  /** Lot PDA address, when on-chain. */
  address?: string;
}

export type TxStatus = 'Vested' | 'Vesting';

/** A purchase made through PAFA. */
export interface Transaction {
  id: string;
  key: string;
  mono: string;
  merchant: string;
  place: string;
  date: string;
  /** USD spent. */
  amount: number;
  /** e.g. `0.045 NKE` */
  shares: string;
  /** USD value of the stock at fill. */
  fill: string;
  /** USD value of that stock now. */
  now: string;
  status: TxStatus;
  brandName: string;
  /** Solana transaction that delivered the cashback stock. */
  signature?: string;
  /** True only when the signature can be verified on the configured cluster. */
  onChain?: boolean;
}

/** Cashback economics used across the demo. */
export interface Economics {
  /** Percent of spend paid back in stock. */
  cashbackRate: number;
  /** USD spend within a calendar month that removes vesting for that month. */
  monthlySpendTarget: number;
  /** Days a lot is held before it becomes tradable. */
  vestingDays: number;
}

export const DEFAULT_ECONOMICS: Economics = {
  cashbackRate: 3.5,
  monthlySpendTarget: 1000,
  vestingDays: 14,
};

/** Every screen in the flow. */
export type Screen =
  | 'home'
  | 'stocks'
  | 'pay'
  | 'review'
  | 'earned'
  | 'brand'
  | 'redeem'
  | 'redeemed'
  | 'sell'
  | 'sold'
  | 'vesting'
  | 'benefits'
  | 'card'
  | 'activity'
  | 'tx';

/** A redemption in flight. */
export interface RedeemDraft {
  brand: string;
  tier: string;
  title: string;
  note: string;
  req: string;
  held: string;
  code: string;
}

/** A sale in flight. The USDC it pays comes from a route quote, not from here. */
export interface SellDraft {
  brandKey: string;
  /**
   * Share count as raw field text, and the single source of truth for the
   * amount — the percentage buttons just write into it. Kept as a string so a
   * half-typed entry like `0.` survives a re-render instead of being
   * normalised out from under the cursor.
   */
  input: string;
}

/** Returns `year * 12 + month` for a date — the monthly vesting bucket. */
export function monthKeyOf(d: Date | number): number {
  const date = typeof d === 'number' ? new Date(d) : d;
  return date.getFullYear() * 12 + date.getMonth();
}
