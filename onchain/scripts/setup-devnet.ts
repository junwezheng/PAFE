/**
 * One-shot devnet setup.
 *
 *   SOLANA_RPC=... PAFA_PROGRAM_ID=... npm run setup:devnet
 *
 * Creates the treasury, mints a stand-in xStock per brand (Jupiter and the real
 * Backed mints are mainnet-only, so devnet needs local mints), initialises the
 * program config, and prints the env lines to paste into app/.env.local.
 */
import { resolve } from 'node:path';
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { BRANDS } from '../../app/src/domain/brands';
import { XSTOCK_DECIMALS } from '../../app/src/solana/xstocks';
import { configPda, ixInitializeConfig } from '../../app/src/solana/program';
import { HERE, connection, env, loadOrCreateKeypair, programId, writeJson } from './shared';

const APP_PUBLIC = resolve(HERE, '../../app/public');

const VESTING_DAYS = Number(process.env.VESTING_DAYS ?? 14);
const MONTHLY_TARGET_CENTS = BigInt(process.env.MONTHLY_TARGET_CENTS ?? 100_000); // $1,000
const CASHBACK_BPS = Number(process.env.CASHBACK_BPS ?? 350); // 3.5%

/** Each demo mint gets this much supply in the treasury. */
const TREASURY_SUPPLY = 1_000_000;

async function main() {
  const conn = connection();
  const pid = programId();
  const treasury = loadOrCreateKeypair('treasury');

  console.log(`RPC        ${env('SOLANA_RPC').replace(/\/v2\/.*/, '/v2/****')}`);
  console.log(`Program    ${pid.toBase58()}`);
  console.log(`Treasury   ${treasury.publicKey.toBase58()}`);

  await ensureFunded(conn, treasury.publicKey);

  // ── xStock stand-in mints ───────────────────────────────────
  const mints: Record<string, string> = {};
  for (const brand of BRANDS) {
    if (!brand.xstockSymbol) {
      console.log(`  skip ${brand.name} — no tokenised equity`);
      continue;
    }

    const mint = await createMint(conn, treasury, treasury.publicKey, null, XSTOCK_DECIMALS);
    const ata = await getOrCreateAssociatedTokenAccount(conn, treasury, mint, treasury.publicKey);
    await mintTo(
      conn,
      treasury,
      mint,
      ata.address,
      treasury,
      BigInt(TREASURY_SUPPLY) * 10n ** BigInt(XSTOCK_DECIMALS),
    );

    mints[brand.xstockSymbol] = mint.toBase58();
    console.log(`  ${brand.xstockSymbol.padEnd(7)} ${mint.toBase58()}`);
  }

  // ── program config ──────────────────────────────────────────
  const config = configPda(pid);
  const existing = await conn.getAccountInfo(config);
  if (existing) {
    console.log(`\nConfig already initialised at ${config.toBase58()}`);
  } else {
    const tx = new Transaction().add(
      ixInitializeConfig(pid, treasury.publicKey, VESTING_DAYS, MONTHLY_TARGET_CENTS, CASHBACK_BPS),
    );
    const sig = await sendAndConfirmTransaction(conn, tx, [treasury]);
    console.log(`\nConfig initialised at ${config.toBase58()}`);
    console.log(`  signature ${sig}`);
  }

  // Also drop a copy where the app can fetch it without a rebuild.
  writeJson(resolve(APP_PUBLIC, 'xstocks.json'), mints);

  console.log('\n─── paste into app/.env.local ───');
  console.log(`VITE_PAFA_PROGRAM_ID=${pid.toBase58()}`);
  console.log(`VITE_PAFA_TREASURY=${treasury.publicKey.toBase58()}`);
  console.log(`VITE_XSTOCK_MINTS=${JSON.stringify(mints)}`);
  console.log('─────────────────────────────────');
}

/** Devnet airdrops are rate-limited; fail loudly rather than half-running. */
async function ensureFunded(conn: Connection, who: PublicKey) {
  const balance = await conn.getBalance(who);
  const needed = 2 * LAMPORTS_PER_SOL;
  if (balance >= needed) {
    console.log(`Balance    ${(balance / LAMPORTS_PER_SOL).toFixed(2)} SOL\n`);
    return;
  }

  console.log(`Balance    ${(balance / LAMPORTS_PER_SOL).toFixed(2)} SOL — requesting airdrop…`);
  try {
    const sig = await conn.requestAirdrop(who, needed - balance);
    await conn.confirmTransaction(sig, 'confirmed');
    console.log('Airdrop    done\n');
  } catch (err) {
    console.error(
      `\nAirdrop failed (${err instanceof Error ? err.message : err}).\n` +
        `Most public devnet RPCs rate-limit airdrops. Fund the treasury manually:\n` +
        `  solana airdrop 2 ${who.toBase58()} --url devnet\n` +
        `or use https://faucet.solana.com, then re-run this script.`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
