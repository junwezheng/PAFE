/**
 * One-shot devnet setup.
 *
 *   SOLANA_RPC=... PAFA_PROGRAM_ID=... npm run setup:devnet
 *
 * Creates the treasury, mints a stand-in xStock per brand (Jupiter and the real
 * Backed mints are mainnet-only, so devnet needs local mints), initialises the
 * program config, and prints the env lines to paste into app/.env.local.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import { BRANDS } from '../../app/src/domain/brands';
import { XSTOCK_DECIMALS } from '../../app/src/solana/xstocks';
import {
  configPda,
  decodeConfig,
  ixInitializeConfig,
  ixSetParams,
} from '../../app/src/solana/program';
import {
  HERE,
  KEYS_DIR,
  connection,
  env,
  loadOrCreateKeypair,
  programId,
  readJson,
  writeJson,
} from './shared';

const APP_PUBLIC = resolve(HERE, '../../app/public');
const APP_ENV = resolve(HERE, '../../app/.env.local');
const STATE_PATH = resolve(KEYS_DIR, 'devnet-state.json');

const VESTING_DAYS = Number(process.env.VESTING_DAYS ?? 14);
const MONTHLY_TARGET_CENTS = BigInt(process.env.MONTHLY_TARGET_CENTS ?? 100_000); // $1,000
const CASHBACK_BPS = Number(process.env.CASHBACK_BPS ?? 350); // 3.5%
const TREASURY_SOL_TARGET = Number(process.env.TREASURY_SOL_TARGET ?? 0.25);
const TREASURY_SOL_MINIMUM = Number(process.env.TREASURY_SOL_MINIMUM ?? 0.05);

/** Each demo mint gets this much supply in the treasury. */
const TREASURY_SUPPLY = 1_000_000;

interface DevnetState {
  programId: string;
  treasury: string;
  mints: Record<string, string>;
}

async function main() {
  const conn = connection();
  const pid = programId();
  const treasury = loadOrCreateKeypair('treasury');

  console.log(`RPC        ${env('SOLANA_RPC').replace(/\/v2\/.*/, '/v2/****')}`);
  console.log(`Program    ${pid.toBase58()}`);
  console.log(`Treasury   ${treasury.publicKey.toBase58()}`);

  await ensureFunded(conn, treasury.publicKey);

  // ── xStock stand-in mints ───────────────────────────────────
  const previous = readJson<DevnetState | null>(STATE_PATH, null);
  const sameDeployment =
    previous?.programId === pid.toBase58() && previous.treasury === treasury.publicKey.toBase58();
  const mints: Record<string, string> = sameDeployment ? previous.mints : {};

  for (const brand of BRANDS) {
    if (!brand.xstockSymbol) {
      console.log(`  skip ${brand.name} — no tokenised equity`);
      continue;
    }

    const saved = mints[brand.xstockSymbol];
    const savedKey = saved ? new PublicKey(saved) : null;
    const savedAccount = savedKey ? await conn.getAccountInfo(savedKey) : null;
    const mint =
      savedKey && savedAccount?.owner.equals(TOKEN_PROGRAM_ID)
        ? savedKey
        : await retry(`create ${brand.xstockSymbol} mint`, () =>
            createMint(conn, treasury, treasury.publicKey, null, XSTOCK_DECIMALS),
          );
    const ata = await retry(`create ${brand.xstockSymbol} treasury account`, () =>
      getOrCreateAssociatedTokenAccount(conn, treasury, mint, treasury.publicKey),
    );
    if (ata.amount === 0n) {
      await retry(`fund ${brand.xstockSymbol} treasury account`, async () => {
        const current = await getAccount(conn, ata.address);
        if (current.amount > 0n) return;
        await mintTo(
          conn,
          treasury,
          mint,
          ata.address,
          treasury,
          BigInt(TREASURY_SUPPLY) * 10n ** BigInt(XSTOCK_DECIMALS),
        );
      });
    }

    mints[brand.xstockSymbol] = mint.toBase58();
    writeJson(STATE_PATH, {
      programId: pid.toBase58(),
      treasury: treasury.publicKey.toBase58(),
      mints,
    } satisfies DevnetState);
    console.log(`  ${brand.xstockSymbol.padEnd(7)} ${mint.toBase58()}${savedAccount ? ' (reused)' : ''}`);
    await sleep(750);
  }

  // ── program config ──────────────────────────────────────────
  const config = configPda(pid);
  const existing = await conn.getAccountInfo(config);
  if (existing) {
    const current = decodeConfig(existing.data);
    if (!current.authority.equals(treasury.publicKey)) {
      throw new Error(
        `Config authority is ${current.authority.toBase58()}, not treasury ${treasury.publicKey.toBase58()}`,
      );
    }
    if (
      current.vestingDays !== VESTING_DAYS ||
      current.monthlySpendTargetCents !== MONTHLY_TARGET_CENTS ||
      current.cashbackBps !== CASHBACK_BPS
    ) {
      const tx = new Transaction().add(
        ixSetParams(pid, treasury.publicKey, VESTING_DAYS, MONTHLY_TARGET_CENTS, CASHBACK_BPS),
      );
      await retry('update program config', () => sendAndConfirmTransaction(conn, tx, [treasury]));
      console.log(`\nConfig updated at ${config.toBase58()}`);
    } else {
      console.log(`\nConfig already initialised at ${config.toBase58()}`);
    }
  } else {
    const tx = new Transaction().add(
      ixInitializeConfig(pid, treasury.publicKey, VESTING_DAYS, MONTHLY_TARGET_CENTS, CASHBACK_BPS),
    );
    const sig = await retry('initialize program config', () =>
      sendAndConfirmTransaction(conn, tx, [treasury]),
    );
    console.log(`\nConfig initialised at ${config.toBase58()}`);
    console.log(`  signature ${sig}`);
  }

  // Also drop a copy where the app can fetch it without a rebuild.
  writeJson(resolve(APP_PUBLIC, 'xstocks.json'), mints);
  updateAppEnv({
    VITE_SOLANA_RPC: env('SOLANA_RPC'),
    VITE_SOLANA_CLUSTER: 'devnet',
    VITE_PAFA_PROGRAM_ID: pid.toBase58(),
    VITE_PAFA_TREASURY: treasury.publicKey.toBase58(),
    VITE_XSTOCK_MINTS: JSON.stringify(mints),
    VITE_PAFA_API: 'http://localhost:8787',
    VITE_FORCE_SIMULATED: 'false',
  });

  console.log(`\nWrote ${APP_ENV}`);
  console.log('─── devnet configuration ───');
  console.log(`VITE_PAFA_PROGRAM_ID=${pid.toBase58()}`);
  console.log(`VITE_PAFA_TREASURY=${treasury.publicKey.toBase58()}`);
  console.log(`VITE_XSTOCK_MINTS=${JSON.stringify(mints)}`);
  console.log('─────────────────────────────────');
}

function updateAppEnv(values: Record<string, string>) {
  let contents = existsSync(APP_ENV)
    ? readFileSync(APP_ENV, 'utf8')
    : readFileSync(resolve(HERE, '../../app/.env.example'), 'utf8');

  for (const [name, value] of Object.entries(values)) {
    const line = `${name}=${value}`;
    const pattern = new RegExp(`^${name}=.*$`, 'm');
    contents = pattern.test(contents) ? contents.replace(pattern, line) : `${contents.trimEnd()}\n${line}\n`;
  }
  writeFileSync(APP_ENV, contents);
}

async function retry<T>(label: string, operation: () => Promise<T>, attempts = 5): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (attempt === attempts) break;
      const delay = attempt * 1_500;
      console.warn(`  ${label} failed (${attempt}/${attempts}); retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
  throw lastError;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Devnet airdrops are rate-limited; fail loudly rather than half-running. */
async function ensureFunded(conn: Connection, who: PublicKey) {
  const balance = await conn.getBalance(who);
  const needed = TREASURY_SOL_TARGET * LAMPORTS_PER_SOL;
  if (balance >= TREASURY_SOL_MINIMUM * LAMPORTS_PER_SOL) {
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
        `  solana transfer ${who.toBase58()} ${TREASURY_SOL_TARGET} --url devnet --allow-unfunded-recipient\n` +
        `or use https://faucet.solana.com, then re-run this script.`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
