import type { ListingStatus, XStockToken } from '../domain/types';
import { BRANDS } from '../domain/brands';

/**
 * xStocks (Backed Finance) mint registry.
 *
 * We never hardcode base58 mint addresses: a wrong address silently routes real
 * value to the wrong token, which is worse than having none. Mints are resolved
 * at runtime, in this order:
 *
 *   1. `VITE_XSTOCK_MINTS` — a JSON map of symbol -> mint. This is what
 *      `onchain/scripts/setup-devnet.ts` writes after creating demo mints.
 *   2. `public/xstocks.json` — same shape, for a checked-in mainnet snapshot.
 *   3. Nothing — the symbol is reported `unknown` and the UI says so.
 */

export const XSTOCK_DECIMALS = 8;

type MintMap = Record<string, string>;

let resolved: Map<string, XStockToken> | null = null;

function parseEnvMints(): MintMap {
  // Written so this module also typechecks under the Node scripts in onchain/,
  // where `import.meta.env` doesn't exist.
  const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
  const raw = meta.env?.VITE_XSTOCK_MINTS;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as MintMap;
  } catch {
    console.warn('[pafa] VITE_XSTOCK_MINTS is not valid JSON — ignoring');
    return {};
  }
}

async function fetchPublicMints(): Promise<MintMap> {
  try {
    const res = await fetch('/xstocks.json', { cache: 'no-store' });
    if (!res.ok) return {};
    return (await res.json()) as MintMap;
  } catch {
    return {};
  }
}

/** Resolve every brand's xStock once, then memoise. */
export async function loadXStocks(): Promise<Map<string, XStockToken>> {
  if (resolved) return resolved;

  const mints: MintMap = { ...(await fetchPublicMints()), ...parseEnvMints() };
  const map = new Map<string, XStockToken>();

  for (const brand of BRANDS) {
    if (!brand.xstockSymbol) continue;
    const mint = mints[brand.xstockSymbol] ?? null;
    const status: ListingStatus = mint ? 'live' : 'unknown';
    map.set(brand.xstockSymbol, { symbol: brand.xstockSymbol, mint, decimals: XSTOCK_DECIMALS, status });
  }

  resolved = map;
  return map;
}

export function xstockFor(brandKey: string, registry: Map<string, XStockToken>): XStockToken | null {
  const brand = BRANDS.find((b) => b.key === brandKey);
  if (!brand?.xstockSymbol) return null;
  return registry.get(brand.xstockSymbol) ?? null;
}

/** Fractional shares -> base units for the mint. */
export function toBaseUnits(shares: number, decimals = XSTOCK_DECIMALS): bigint {
  return BigInt(Math.round(shares * 10 ** decimals));
}

export function fromBaseUnits(amount: bigint, decimals = XSTOCK_DECIMALS): number {
  return Number(amount) / 10 ** decimals;
}
