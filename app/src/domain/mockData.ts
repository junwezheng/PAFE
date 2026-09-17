import { DAY_MS } from '../lib/format';
import { monthKeyOf } from './types';
import type { Holding, Transaction, VestingLot } from './types';

/**
 * Demo seed state, matching the prototype exactly so the hero flow lands on the
 * same numbers: September spend starts at $918.40, so the $96.50 Nike payment
 * crosses the $1,000 monthly target and releases September's three lots.
 */
export const SEED_SPEND = 918.4;

/** The one purchase the demo actually executes. */
export const DEMO_PURCHASE = {
  merchant: 'Nike Store',
  place: 'Orchard Road · Verified merchant',
  brandKey: 'NKE',
  amount: 96.5,
};

export const SEED_HOLDINGS: Holding[] = [
  { key: 'AAPL', name: 'Apple', ticker: 'AAPL', mono: 'AP', shares: 1.84, price: 262.02, value: 482.12, chg: 1.42 },
  { key: 'NKE', name: 'Nike', ticker: 'NKE', mono: 'NK', shares: 4.12, price: 106.4, value: 438.9, chg: 0.86 },
  { key: 'SBUX', name: 'Starbucks', ticker: 'SBUX', mono: 'SB', shares: 2.4, price: 89.42, value: 214.6, chg: -0.42 },
  { key: 'AMZN', name: 'Amazon', ticker: 'AMZN', mono: 'AM', shares: 0.61, price: 233.28, value: 142.3, chg: 2.11 },
  { key: 'UBER', name: 'Uber', ticker: 'UBER', mono: 'UB', shares: 1.1, price: 93.45, value: 102.8, chg: 0.35 },
  { key: 'NFLX', name: 'Netflix', ticker: 'NFLX', mono: 'NF', shares: 0.09, price: 1071.1, value: 96.4, chg: -1.08 },
  { key: 'MCD', name: "McDonald's", ticker: 'MCD', mono: 'MC', shares: 0.31, price: 303.55, value: 94.1, chg: 0.22 },
  { key: 'GRAB', name: 'Grab', ticker: 'GRAB', mono: 'GR', shares: 18.4, price: 4.8, value: 88.3, chg: 3.4 },
  { key: 'ABNB', name: 'Airbnb', ticker: 'ABNB', mono: 'AB', shares: 0.44, price: 140.68, value: 61.9, chg: -0.64 },
  // Pre-IPO positions. These prices are placeholders: once the PreStocks feed
  // resolves, `price` and `value` are recomputed from the live `tokenPrice`.
  { key: 'OPENAI', name: 'OpenAI', ticker: 'OPENAI', mono: 'OA', shares: 0.128, price: 971.64, value: 124.37, chg: 1.94 },
  {
    key: 'ANTHROPIC',
    name: 'Anthropic',
    ticker: 'ANTHROPIC',
    mono: 'AN',
    shares: 0.061,
    price: 961.25,
    value: 58.64,
    chg: 2.63,
  },
];

export function seedLots(now: number, vestingDays: number): VestingLot[] {
  const mk = monthKeyOf(now);
  const base = [
    { key: 'NKE', name: 'Nike', mono: 'NK', shares: 0.079, value: 8.42, ageDays: 2.1 },
    { key: 'SBUX', name: 'Starbucks', mono: 'SB', shares: 0.041, value: 3.9, ageDays: 1.2 },
    { key: 'GRAB', name: 'Grab', mono: 'GR', shares: 2.1, value: 1.05, ageDays: 0.3 },
  ];
  return base.map((l, i) => {
    const earnedAt = now - l.ageDays * DAY_MS;
    return {
      index: i,
      key: l.key,
      name: l.name,
      mono: l.mono,
      shares: l.shares,
      value: l.value,
      earnedAt,
      unlockAt: earnedAt + vestingDays * DAY_MS,
      monthKey: mk,
      released: false,
    };
  });
}

/** Transaction history. The Nike row only appears once the demo payment lands. */
export const SEED_TRANSACTIONS: Omit<Transaction, 'status'>[] = [
  {
    id: 'tx-nke',
    key: 'NKE',
    mono: 'NK',
    merchant: 'Nike Store Orchard',
    place: 'Singapore',
    date: 'Sep 16, 2026',
    amount: 96.5,
    shares: '0.045 NKE',
    fill: '$4.83',
    now: '$4.91',
    brandName: 'Nike',
    signature: '3jjWLoz3uYNL6bkaNxzKE42jcszGCQm3swScMGUGLBAjjQZHwU2orNSUXrX7j71psqwvycpyq86RLcH5nJBSJ89v',
    onChain: false,
  },
  {
    id: 'tx-sbux',
    key: 'SBUX',
    mono: 'SB',
    merchant: 'Starbucks Raffles',
    place: 'Singapore',
    date: 'Sep 15, 2026',
    amount: 12.4,
    shares: '0.041 SBUX',
    fill: '$3.90',
    now: '$3.86',
    brandName: 'Starbucks',
    signature: '4F1WJ99xmNKdxrvDEdf4o98mRpEESgxdj9vUCfsrstcFDetZwJPFSSjTAoLQSDCknc822UXkRS6J1Ax5MLtn82WC',
    onChain: false,
  },
  {
    id: 'tx-grab',
    key: 'GRAB',
    mono: 'GR',
    merchant: 'Grab ride',
    place: 'Singapore',
    date: 'Sep 16, 2026',
    amount: 21.0,
    shares: '2.10 GRAB',
    fill: '$1.05',
    now: '$1.09',
    brandName: 'Grab',
    signature: 'C5mku2EbPD2GacbMRpfMDkGhvK9gaQp82o3EQDJFrT7DyvPkLhg9aAbSoGN9Jrx3VGw9WHvkBZNEr5CHCEg9C9A',
    onChain: false,
  },
  {
    id: 'tx-aapl',
    key: 'AAPL',
    mono: 'AP',
    merchant: 'Apple Store',
    place: 'Online',
    date: 'Sep 11, 2026',
    amount: 249.0,
    shares: '0.047 AAPL',
    fill: '$12.45',
    now: '$12.63',
    brandName: 'Apple',
    signature: 'NFbpyjSbN3uVe2dfV9YDL1DuJYqasidpJMFxEBspJTyedx364FqZdrH3wrnYSCYg3k1TbkPoSkwSiX2rkyL4sBU',
    onChain: false,
  },
  {
    id: 'tx-amzn',
    key: 'AMZN',
    mono: 'AM',
    merchant: 'Amazon',
    place: 'Online',
    date: 'Sep 8, 2026',
    amount: 84.2,
    shares: '0.018 AMZN',
    fill: '$4.21',
    now: '$4.40',
    brandName: 'Amazon',
    signature: '2oqRv5YG7VLrw5R3XReMEaQ3pLMxM1xCnzCB2jvszhgP5uXv7MfQ1YNHTL7FquDJF9f5ezC4dSCz9XnGAt5LCDVd',
    onChain: false,
  },
  {
    id: 'tx-mcd',
    key: 'MCD',
    mono: 'MC',
    merchant: "McDonald's Bugis",
    place: 'Singapore',
    date: 'Sep 6, 2026',
    amount: 18.9,
    shares: '0.003 MCD',
    fill: '$0.95',
    now: '$0.96',
    brandName: "McDonald's",
    signature: '3V8hu9G6yBde6ojsGSmZWq9X4XFuLHcuYJomR1ziGrZW34HweNwNY4X4xmGdXH5zTmavbYeVfuby8jnF1kqvTurB',
    onChain: false,
  },
];

/** The first three rows of history are this month's, so the waiver frees them. */
export const THIS_MONTH_TX_IDS = new Set(['tx-nke', 'tx-sbux', 'tx-grab']);

/** Higher-rate merchants shown on the Pay screen. */
export const NEARBY = [
  { mono: 'SB', name: 'Starbucks', place: 'Raffles City · 120m', rate: '5.0%' },
  { mono: 'NK', name: 'Nike Store', place: 'Orchard Road · 340m', rate: '4.5%' },
  { mono: 'MC', name: "McDonald's", place: 'Bugis Junction · 600m', rate: '4.0%' },
];
