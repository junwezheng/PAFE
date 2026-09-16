import { PublicKey } from '@solana/web3.js';

/**
 * Cluster wiring. Everything is env-driven so the demo can run three ways:
 *
 *   * no env at all      -> simulated adapter, fully offline
 *   * RPC + program id   -> real devnet transactions
 *   * RPC only           -> reads work, writes fall back to simulated
 */

const env = import.meta.env;

export const RPC_URL: string = env.VITE_SOLANA_RPC ?? '';

export const CLUSTER: 'devnet' | 'mainnet-beta' | 'testnet' =
  (env.VITE_SOLANA_CLUSTER as 'devnet' | 'mainnet-beta' | 'testnet') ?? 'devnet';

/** Set once `anchor deploy` has printed the program id. */
export const PROGRAM_ID: PublicKey | null = safeKey(env.VITE_PAFA_PROGRAM_ID);

/**
 * PAFA's treasury — supplies the xStock and pays lot rent. In production this
 * signs server-side; in the devnet demo the setup script funds it and the
 * keypair is loaded by `scripts/pay.ts`, never by the browser.
 */
export const TREASURY: PublicKey | null = safeKey(env.VITE_PAFA_TREASURY);

/**
 * Base URL of the settlement service that signs as the treasury. `record_purchase`
 * moves tokens out of the treasury's account, so it can never be signed in the
 * browser; `onchain/scripts/settle.ts` is the reference implementation.
 */
export const PAFA_API: string = env.VITE_PAFA_API ?? '';

/** Explicit opt-out, e.g. to demo the offline path with an RPC configured. */
export const FORCE_SIMULATED: boolean = env.VITE_FORCE_SIMULATED === 'true';

export const ON_CHAIN_READY: boolean = !FORCE_SIMULATED && Boolean(RPC_URL) && PROGRAM_ID !== null;

function safeKey(value: string | undefined): PublicKey | null {
  if (!value) return null;
  try {
    return new PublicKey(value);
  } catch {
    console.warn(`[pafa] Ignoring malformed pubkey in env: ${value}`);
    return null;
  }
}

export function explorerTx(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER}`;
}

export function explorerAddress(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=${CLUSTER}`;
}
