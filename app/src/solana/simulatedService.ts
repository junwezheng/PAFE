import { PublicKey } from '@solana/web3.js';
import { fakeSignature } from '../lib/base58';
import { syntheticRoute, type SwapRoute } from './jupiter';
import { lotPda } from './program';
import type {
  PurchaseInput,
  PurchaseResult,
  ReleaseRequest,
  ReleaseResult,
  ServiceMode,
  SolanaService,
} from './service';

/**
 * Offline adapter. It does no network I/O, but it walks the same shapes as the
 * real one — real PDA derivation, real lot indices, plausible signatures — so
 * the UI code path is identical and swapping in devnet changes nothing upstream.
 *
 * Every result it returns is marked `onChain: false`, and the UI badges it.
 */
export class SimulatedService implements SolanaService {
  readonly mode: ServiceMode = 'simulated';

  /** A stable stand-in owner so derived addresses look consistent across a session. */
  private readonly owner = PublicKey.unique();
  private readonly programId = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
  private lotCount = 3; // the three seeded lots

  constructor(private readonly reason: string) {}

  describe(): string {
    return `simulated · ${this.reason}`;
  }

  async quote(input: PurchaseInput): Promise<SwapRoute> {
    return syntheticRoute({
      outputSymbol: input.token?.symbol ?? `${input.ticker}x`,
      usdAmount: (input.amountUsd * input.cashbackRate) / 100,
      pricePerShare: input.pricePerShare,
      via: 'simulated route',
    });
  }

  async recordPurchase(input: PurchaseInput): Promise<PurchaseResult> {
    const route = await this.quote(input);
    const lotIndex = this.lotCount++;
    return {
      route,
      lotIndex,
      lotAddress: lotPda(this.programId, this.owner, lotIndex).toBase58(),
      signature: fakeSignature(),
      stockShares: route.outputShares,
      onChain: false,
      note: `Simulated — ${this.reason}.`,
    };
  }

  async releaseLots(lots: ReleaseRequest[]): Promise<ReleaseResult[]> {
    return lots.map((lot) => ({
      lotIndex: lot.index,
      signature: fakeSignature(),
      onChain: false,
      note: `Simulated — ${this.reason}.`,
    }));
  }
}
