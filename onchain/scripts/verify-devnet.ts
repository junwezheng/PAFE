/**
 * End-to-end devnet probe.
 *
 * Requires `npm run settle` in another terminal, then:
 *   SOLANA_RPC=... PAFA_PROGRAM_ID=... npm run verify:devnet
 *
 * Creates a disposable user, settles one target-sized Nike purchase through
 * the treasury service, then signs waive_lot + release_lot as that user.
 */
import { Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
  configPda,
  decodeConfig,
  fetchUserState,
  ixReleaseLot,
  ixWaiveLot,
} from '../../app/src/solana/program';
import { KEYS_DIR, connection, programId, readJson } from './shared';
import { resolve } from 'node:path';

interface DevnetState {
  programId: string;
  treasury: string;
  mints: Record<string, string>;
}

async function main() {
  const conn = connection();
  const pid = programId();
  const api = process.env.PAFA_API ?? 'http://localhost:8787';
  const state = readJson<DevnetState | null>(resolve(KEYS_DIR, 'devnet-state.json'), null);
  const mint = state?.mints.NKEx;
  if (!mint) throw new Error('NKEx mint missing — run `npm run setup:devnet` first');

  const health = await fetch(`${api}/health`);
  if (!health.ok) throw new Error(`Settlement health check failed (${health.status})`);

  const configInfo = await conn.getAccountInfo(configPda(pid));
  if (!configInfo) throw new Error('Program config is not initialized');
  const config = decodeConfig(configInfo.data);

  const owner = Keypair.generate();
  const purchase = await fetch(`${api}/purchase`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      owner: owner.publicKey.toBase58(),
      brandKey: 'NKE',
      spendCents: Number(config.monthlySpendTargetCents),
      stockAmount: '1000000',
      mint,
    }),
  });
  const result = (await purchase.json()) as {
    signature?: string;
    lotIndex?: number;
    error?: string;
  };
  if (!purchase.ok || !result.signature || result.lotIndex === undefined) {
    throw new Error(result.error ?? `Settlement failed (${purchase.status})`);
  }

  const user = await fetchUserState(conn, pid, owner.publicKey);
  if (!user?.vestingWaived) throw new Error('Purchase did not activate the monthly waiver');

  const mintKey = new PublicKey(mint);
  const tx = new Transaction().add(
    ixWaiveLot(pid, owner.publicKey, result.lotIndex),
    ixReleaseLot({
      programId: pid,
      owner: owner.publicKey,
      mint: mintKey,
      lotIndex: result.lotIndex,
    }),
  );
  const releaseSignature = await sendAndConfirmTransaction(conn, tx, [owner], {
    commitment: 'confirmed',
  });

  const ownerAta = getAssociatedTokenAddressSync(mintKey, owner.publicKey);
  const tokenAccount = await getAccount(conn, ownerAta, 'confirmed');
  if (tokenAccount.amount !== 1_000_000n) {
    throw new Error(`Expected 1000000 released units, got ${tokenAccount.amount}`);
  }

  console.log('Devnet flow verified');
  console.log(`  program    ${pid.toBase58()}`);
  console.log(`  owner      ${owner.publicKey.toBase58()}`);
  console.log(`  settlement ${result.signature}`);
  console.log(`  release    ${releaseSignature}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
