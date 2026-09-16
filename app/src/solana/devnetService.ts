import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  type Connection,
  type TransactionInstruction,
} from '@solana/web3.js';
import { shortAddress } from '../lib/format';
import { CLUSTER, PAFA_API } from './config';
import { quoteUsdcToXStock, syntheticRoute, type SwapRoute } from './jupiter';
import { fetchUserState, ixReleaseLot, ixWaiveLot, lotPda } from './program';
import { toBaseUnits } from './xstocks';
import type {
  PafaWallet,
  PurchaseInput,
  PurchaseResult,
  ReleaseRequest,
  ReleaseResult,
  ServiceMode,
  SolanaService,
} from './service';

/**
 * Real cluster adapter.
 *
 * Split of responsibilities, which is also how this would ship:
 *
 *   * `release_lot` / `waive_lot` are signed by the *user's* wallet (the Privy
 *     embedded Solana wallet), so they happen right here in the browser.
 *   * `record_purchase` moves tokens out of PAFA's treasury, so it must be
 *     signed server-side. We POST to `VITE_PAFA_API`; with no API configured we
 *     return the priced route and say plainly that nothing settled on-chain.
 */
export class DevnetService implements SolanaService {
  readonly mode: ServiceMode = 'devnet';

  constructor(
    private readonly connection: Connection,
    private readonly programId: PublicKey,
    private readonly wallet: PafaWallet,
    private readonly treasury: PublicKey | null,
  ) {}

  describe(): string {
    return `${CLUSTER} · ${shortAddress(this.wallet.address)}`;
  }

  private get owner(): PublicKey {
    return new PublicKey(this.wallet.address);
  }

  async quote(input: PurchaseInput): Promise<SwapRoute> {
    const usdAmount = (input.amountUsd * input.cashbackRate) / 100;
    const symbol = input.token?.symbol ?? `${input.ticker}x`;

    // Jupiter is mainnet-only; anywhere else we price from the share price.
    if (CLUSTER === 'mainnet-beta' && input.token?.mint) {
      const live = await quoteUsdcToXStock({
        outputMint: input.token.mint,
        outputSymbol: symbol,
        usdAmount,
        outputDecimals: input.token.decimals,
      });
      if (live) return live;
    }

    return syntheticRoute({
      outputSymbol: symbol,
      usdAmount,
      pricePerShare: input.pricePerShare,
      via: CLUSTER === 'devnet' ? 'treasury mint (devnet)' : 'quoted price',
    });
  }

  async recordPurchase(input: PurchaseInput): Promise<PurchaseResult> {
    const route = await this.quote(input);
    const nextIndex = await this.nextLotIndex();

    if (!PAFA_API) {
      return {
        route,
        lotIndex: nextIndex,
        lotAddress: lotPda(this.programId, this.owner, nextIndex).toBase58(),
        signature: null,
        stockShares: route.outputShares,
        onChain: false,
        note:
          'Priced on-chain, but not settled: record_purchase needs the treasury signature. ' +
          'Set VITE_PAFA_API to the settlement service to close the loop.',
      };
    }

    try {
      const res = await fetch(`${PAFA_API.replace(/\/$/, '')}/purchase`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          owner: this.wallet.address,
          brandKey: input.brandKey,
          spendCents: Math.round(input.amountUsd * 100),
          stockAmount: toBaseUnits(route.outputShares, input.token?.decimals).toString(),
          mint: input.token?.mint ?? null,
          lotIndex: nextIndex,
        }),
      });

      if (!res.ok) throw new Error(`settlement service returned ${res.status}`);
      const body = (await res.json()) as { signature: string; lotIndex?: number };
      const lotIndex = body.lotIndex ?? nextIndex;

      return {
        route,
        lotIndex,
        lotAddress: lotPda(this.programId, this.owner, lotIndex).toBase58(),
        signature: body.signature,
        stockShares: route.outputShares,
        onChain: true,
      };
    } catch (err) {
      return {
        route,
        lotIndex: nextIndex,
        lotAddress: lotPda(this.programId, this.owner, nextIndex).toBase58(),
        signature: null,
        stockShares: route.outputShares,
        onChain: false,
        note: `Settlement failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async releaseLots(lots: ReleaseRequest[]): Promise<ReleaseResult[]> {
    const results: ReleaseResult[] = [];

    for (const lot of lots) {
      if (!lot.mint) {
        results.push({
          lotIndex: lot.index,
          signature: null,
          onChain: false,
          note: 'No xStock mint resolved for this brand — nothing to release on-chain.',
        });
        continue;
      }

      try {
        const mint = new PublicKey(lot.mint);
        const instructions: TransactionInstruction[] = [];
        if (lot.waiveFirst) {
          instructions.push(ixWaiveLot(this.programId, this.owner, lot.index));
        }
        instructions.push(ixReleaseLot({ programId: this.programId, owner: this.owner, mint, lotIndex: lot.index }));

        const signature = await this.sendSigned(instructions);
        results.push({ lotIndex: lot.index, signature, onChain: true });
      } catch (err) {
        results.push({
          lotIndex: lot.index,
          signature: null,
          onChain: false,
          note: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }

  /** Build, have the user's wallet sign, send, and confirm. */
  private async sendSigned(instructions: TransactionInstruction[]): Promise<string> {
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    const message = new TransactionMessage({
      payerKey: this.owner,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const signed = await this.wallet.signTransaction(new VersionedTransaction(message));
    const signature = await this.connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
    return signature;
  }

  /** The next lot index is whatever the on-chain counter says. */
  private async nextLotIndex(): Promise<number> {
    try {
      const state = await fetchUserState(this.connection, this.programId, this.owner);
      return state?.lotCount ?? 0;
    } catch {
      return 0;
    }
  }

  /** Unused today, but the treasury is worth surfacing in diagnostics. */
  get treasuryAddress(): string | null {
    return this.treasury?.toBase58() ?? null;
  }
}
