/**
 * Jupiter routing for the cashback leg: USDC -> xStock.
 *
 * PAFA takes the merchant's settlement in USDC, swaps the cashback slice into
 * the brand's tokenised equity, and escrows the result. Jupiter is mainnet-only
 * — there is no devnet aggregator — so on devnet the route is priced from the
 * quoted share price and the tokens come from the treasury's demo mint instead.
 * `live` says which of the two you're looking at, and the UI labels it.
 */

export const USDC_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export interface SwapRoute {
  inputSymbol: string;
  outputSymbol: string;
  /** USDC spent on the cashback leg. */
  inputUsd: number;
  /** Fractional shares received. */
  outputShares: number;
  /** Price per share used for the fill. */
  pricePerShare: number;
  /** Route label, e.g. `Jupiter · Orca → Raydium` or `treasury mint (devnet)`. */
  via: string;
  /** True when the numbers came from a real Jupiter quote. */
  live: boolean;
  priceImpactPct?: number;
}

const QUOTE_ENDPOINT = 'https://lite-api.jup.ag/swap/v1/quote';

/**
 * Ask Jupiter what `usdAmount` of USDC actually buys. Returns null on any
 * failure — no aggregator on this cluster, network blocked, unlisted mint — and
 * the caller falls back to `syntheticRoute`.
 */
export async function quoteUsdcToXStock(params: {
  outputMint: string;
  outputSymbol: string;
  usdAmount: number;
  outputDecimals: number;
  slippageBps?: number;
  signal?: AbortSignal;
}): Promise<SwapRoute | null> {
  const { outputMint, outputSymbol, usdAmount, outputDecimals, slippageBps = 50, signal } = params;
  const amount = Math.round(usdAmount * 1e6); // USDC has 6 decimals

  try {
    const url = new URL(QUOTE_ENDPOINT);
    url.searchParams.set('inputMint', USDC_MAINNET);
    url.searchParams.set('outputMint', outputMint);
    url.searchParams.set('amount', String(amount));
    url.searchParams.set('slippageBps', String(slippageBps));

    const res = await fetch(url, { signal });
    if (!res.ok) return null;

    const quote = (await res.json()) as {
      outAmount?: string;
      priceImpactPct?: string;
      routePlan?: { swapInfo?: { label?: string } }[];
    };
    if (!quote.outAmount) return null;

    const outputShares = Number(quote.outAmount) / 10 ** outputDecimals;
    if (!Number.isFinite(outputShares) || outputShares <= 0) return null;

    const labels = (quote.routePlan ?? []).map((r) => r.swapInfo?.label).filter(Boolean);

    return {
      inputSymbol: 'USDC',
      outputSymbol,
      inputUsd: usdAmount,
      outputShares,
      pricePerShare: usdAmount / outputShares,
      via: labels.length ? `Jupiter · ${labels.join(' → ')}` : 'Jupiter',
      live: true,
      priceImpactPct: quote.priceImpactPct ? Number(quote.priceImpactPct) : undefined,
    };
  } catch {
    return null;
  }
}

/** Price the leg from a known share price when no aggregator is reachable. */
export function syntheticRoute(params: {
  outputSymbol: string;
  usdAmount: number;
  pricePerShare: number;
  via: string;
}): SwapRoute {
  const { outputSymbol, usdAmount, pricePerShare, via } = params;
  return {
    inputSymbol: 'USDC',
    outputSymbol,
    inputUsd: usdAmount,
    outputShares: usdAmount / pricePerShare,
    pricePerShare,
    via,
    live: false,
  };
}
