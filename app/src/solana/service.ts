import { Connection, PublicKey, type VersionedTransaction } from '@solana/web3.js';
import type { XStockToken } from '../domain/types';
import { FORCE_SIMULATED, PROGRAM_ID, RPC_URL, TREASURY } from './config';
import type { SwapRoute } from './jupiter';

/** Which adapter is live. Surfaced in the UI so a demo is never misread as real. */
export type ServiceMode = 'devnet' | 'simulated';

/** Whatever Privy (or any wallet) hands us for signing. */
export interface PafaWallet {
  address: string;
  signTransaction(tx: VersionedTransaction): Promise<VersionedTransaction>;
}

export interface PurchaseInput {
  brandKey: string;
  ticker: string;
  amountUsd: number;
  cashbackRate: number;
  pricePerShare: number;
  token: XStockToken | null;
}

export interface PurchaseResult {
  route: SwapRoute;
  lotIndex: number;
  lotAddress: string | null;
  signature: string | null;
  stockShares: number;
  onChain: boolean;
  /** Set when the write had to degrade — always shown, never swallowed. */
  note?: string;
}

export interface ReleaseResult {
  lotIndex: number;
  signature: string | null;
  onChain: boolean;
  note?: string;
}

export interface SolanaService {
  readonly mode: ServiceMode;
  /** One line for the status chip, e.g. "devnet · 7xKq…9fA2". */
  describe(): string;
  quote(input: PurchaseInput): Promise<SwapRoute>;
  recordPurchase(input: PurchaseInput): Promise<PurchaseResult>;
  /** Release a set of lots — used both for the cliff and the monthly waiver. */
  releaseLots(lots: ReleaseRequest[]): Promise<ReleaseResult[]>;
}

export interface ReleaseRequest {
  index: number;
  mint: string | null;
  /**
   * Prepend `waive_lot`, pinning the monthly-spend waiver onto the lot before
   * claiming it. Set when the release is driven by hitting the spend target
   * rather than by the time cliff.
   */
  waiveFirst?: boolean;
}

/** Shared connection, created lazily so the offline path never touches RPC. */
let connection: Connection | null = null;
export function getConnection(): Connection | null {
  if (!RPC_URL) return null;
  if (!connection) connection = new Connection(RPC_URL, 'confirmed');
  return connection;
}

/**
 * Pick an adapter. Devnet needs three things — an RPC, a deployed program id,
 * and a signed-in wallet. Missing any of them falls back to the simulated
 * adapter rather than throwing, so the demo always runs.
 */
export async function createSolanaService(wallet: PafaWallet | null): Promise<SolanaService> {
  const conn = getConnection();
  const programId = PROGRAM_ID;

  if (!FORCE_SIMULATED && conn && programId && wallet) {
    const { DevnetService } = await import('./devnetService');
    return new DevnetService(conn, programId, wallet, TREASURY);
  }

  const { SimulatedService } = await import('./simulatedService');
  return new SimulatedService(reasonForSimulation(wallet));
}

function reasonForSimulation(wallet: PafaWallet | null): string {
  if (FORCE_SIMULATED) return 'VITE_FORCE_SIMULATED=true';
  if (!RPC_URL) return 'no VITE_SOLANA_RPC configured';
  if (!PROGRAM_ID) return 'no VITE_PAFA_PROGRAM_ID — deploy the program first';
  if (!wallet) return 'no wallet connected';
  return 'simulated';
}

export { PublicKey };
