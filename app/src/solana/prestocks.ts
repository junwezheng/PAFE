import type { PreStockToken } from '../domain/types';
import { BRANDS } from '../domain/brands';

/**
 * PreStocks registry — tokenised pre-IPO equity on Solana.
 *
 * xStocks only covers listed companies, so brands like OpenAI and Anthropic had
 * nowhere for cashback to go. PreStocks issues an SPV-backed SPL token per
 * private company and publishes the mint and price, which is why this resolves
 * at runtime instead of committing addresses — the same rule as `xstocks.ts`.
 *
 * Two things the API does not give us, and how we get them:
 *
 *   - **Decimals.** Read from Jupiter's token list. Without them a sale can't be
 *     converted to base units, so it falls back to a synthetic price instead.
 *   - **Day change.** Not published, so holdings keep their seeded `chg` rather
 *     than showing a number we made up.
 *
 * PreStocks sends no CORS header, so the browser goes through a same-origin
 * proxy: a Vercel rewrite in production, Vite's proxy in dev and preview. Both
 * map `/api/prestocks` to `https://prestocks.com/api/prestocks`.
 */

const PRESTOCKS_ENDPOINT = '/api/prestocks';
const JUPITER_TOKENS = 'https://lite-api.jup.ag/tokens/v2/search';

interface ApiEntry {
  symbol: string;
  contract_address: string;
  tokenPrice: number;
}

export interface PreStockRegistry {
  tokens: Map<string, PreStockToken>;
  /** True when prices in this registry came from the PreStocks API. */
  live: boolean;
}

export const EMPTY_PRESTOCKS: PreStockRegistry = { tokens: new Map(), live: false };

let cached: PreStockRegistry | null = null;

async function fetchListing(): Promise<ApiEntry[]> {
  try {
    const res = await fetch(PRESTOCKS_ENDPOINT, { cache: 'no-store' });
    if (!res.ok) return [];
    const body = (await res.json()) as unknown;
    return Array.isArray(body) ? (body as ApiEntry[]) : [];
  } catch {
    // Offline, proxy absent, or API down. Every symbol stays `unknown` and the
    // UI keeps its seeded price behind a label that says the feed isn't live.
    return [];
  }
}

/** Mint -> decimals, in one batched call. Missing entries stay unresolved. */
async function fetchDecimals(mints: string[]): Promise<Map<string, number>> {
  const found = new Map<string, number>();
  if (mints.length === 0) return found;
  try {
    const res = await fetch(`${JUPITER_TOKENS}?query=${mints.join(',')}`);
    if (!res.ok) return found;
    const body = (await res.json()) as { id?: string; decimals?: number }[];
    for (const t of Array.isArray(body) ? body : []) {
      if (t.id && Number.isInteger(t.decimals)) found.set(t.id, t.decimals as number);
    }
  } catch {
    return found;
  }
  return found;
}

/** Resolve every pre-IPO brand's token once, then memoise. */
export async function loadPreStocks(): Promise<PreStockRegistry> {
  if (cached) return cached;

  const wanted = BRANDS.map((b) => b.prestockSymbol).filter((s): s is string => !!s);
  const listing = await fetchListing();
  const bySymbol = new Map(listing.map((e) => [e.symbol, e]));

  const usable = wanted
    .map((symbol) => bySymbol.get(symbol))
    .filter((e): e is ApiEntry => !!e && Number.isFinite(e.tokenPrice) && e.tokenPrice > 0);
  const decimals = await fetchDecimals(usable.map((e) => e.contract_address));

  const tokens = new Map<string, PreStockToken>();
  for (const symbol of wanted) {
    const entry = usable.find((e) => e.symbol === symbol);
    tokens.set(
      symbol,
      entry
        ? {
            symbol,
            mint: entry.contract_address,
            tokenPrice: entry.tokenPrice,
            decimals: decimals.get(entry.contract_address) ?? null,
            status: 'live',
          }
        : { symbol, mint: null, tokenPrice: null, decimals: null, status: 'unknown' },
    );
  }

  cached = { tokens, live: usable.length > 0 };
  return cached;
}

export function prestockFor(brandKey: string, registry: PreStockRegistry): PreStockToken | null {
  const brand = BRANDS.find((b) => b.key === brandKey);
  if (!brand?.prestockSymbol) return null;
  return registry.tokens.get(brand.prestockSymbol) ?? null;
}
