import type { Brand } from './types';

/**
 * The nine brands the design ships with.
 *
 * `xstockSymbol` is the Backed Finance / xStocks symbol we'd route cashback
 * into. Whether a given symbol actually has a live mint is resolved at runtime
 * from a token list (see `src/solana/xstocks.ts`) — we deliberately do not
 * hardcode mint addresses, because a wrong base58 address is worse than none.
 *
 * Grab is listed on Nasdaq as GRAB but has no xStock at the time of writing;
 * brands with no live mint fall back to the index basket (see `vesting.ts`).
 */
export const BRANDS: Brand[] = [
  { key: 'AAPL', name: 'Apple', mono: 'AP', ticker: 'AAPL', xstockSymbol: 'AAPLx' },
  { key: 'NKE', name: 'Nike', mono: 'NK', ticker: 'NKE', xstockSymbol: 'NKEx' },
  { key: 'SBUX', name: 'Starbucks', mono: 'SB', ticker: 'SBUX', xstockSymbol: 'SBUXx' },
  { key: 'AMZN', name: 'Amazon', mono: 'AM', ticker: 'AMZN', xstockSymbol: 'AMZNx' },
  { key: 'UBER', name: 'Uber', mono: 'UB', ticker: 'UBER', xstockSymbol: 'UBERx' },
  { key: 'NFLX', name: 'Netflix', mono: 'NF', ticker: 'NFLX', xstockSymbol: 'NFLXx' },
  { key: 'MCD', name: "McDonald's", mono: 'MC', ticker: 'MCD', xstockSymbol: 'MCDx' },
  { key: 'GRAB', name: 'Grab', mono: 'GR', ticker: 'GRAB', xstockSymbol: null },
  { key: 'ABNB', name: 'Airbnb', mono: 'AB', ticker: 'ABNB', xstockSymbol: 'ABNBx' },
];

export const brandByKey = (key: string): Brand | undefined => BRANDS.find((b) => b.key === key);
