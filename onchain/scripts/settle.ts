/**
 * Settlement service — the treasury side of a purchase.
 *
 *   SOLANA_RPC=... PAFA_PROGRAM_ID=... npm run settle
 *
 * `record_purchase` moves xStock out of PAFA's treasury account, so it needs the
 * treasury's signature and can never run in the browser. This is the smallest
 * honest version of that: one endpoint, signing with the keypair that
 * `setup-devnet.ts` created. Point the app at it with VITE_PAFA_API.
 *
 * Not production code — no auth, no idempotency key, no rate limiting. A real
 * deployment would verify the merchant settlement before minting a lot.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { BRANDS } from '../../app/src/domain/brands';
import { fetchUserState, ixInitUser, ixRecordPurchase } from '../../app/src/solana/program';
import { KEYS_DIR, connection, loadOrCreateKeypair, programId, readJson } from './shared';
import { resolve } from 'node:path';

const PORT = Number(process.env.PORT ?? 8787);
const USER_SOL_TARGET = Number(process.env.USER_SOL_TARGET ?? 0.01) * LAMPORTS_PER_SOL;
const MAX_STOCK_AMOUNT = BigInt(process.env.MAX_STOCK_AMOUNT ?? 100_000_000_000);

interface PurchaseBody {
  owner: string;
  brandKey: string;
  spendCents: number;
  stockAmount: string;
  mint: string | null;
  lotIndex?: number;
}

interface DevnetState {
  programId: string;
  treasury: string;
  mints: Record<string, string>;
}

const conn = connection();
const pid = programId();
const treasury = loadOrCreateKeypair('treasury');
const devnetState = readJson<DevnetState | null>(resolve(KEYS_DIR, 'devnet-state.json'), null);
if (
  !devnetState ||
  devnetState.programId !== pid.toBase58() ||
  devnetState.treasury !== treasury.publicKey.toBase58()
) {
  throw new Error('Missing or stale .keys/devnet-state.json — run `npm run setup:devnet` first');
}
let settlementQueue = Promise.resolve();

const server = createServer(async (req, res) => {
  // Browser calls this cross-origin from the Vite dev server.
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    const [program, balance] = await Promise.all([
      conn.getAccountInfo(pid),
      conn.getBalance(treasury.publicKey),
    ]);
    json(res, program?.executable ? 200 : 503, {
      ok: Boolean(program?.executable),
      programId: pid.toBase58(),
      treasury: treasury.publicKey.toBase58(),
      treasurySol: balance / LAMPORTS_PER_SOL,
    });
    return;
  }
  if (req.method !== 'POST' || !req.url?.endsWith('/purchase')) {
    json(res, 404, { error: 'GET /health or POST /purchase' });
    return;
  }

  try {
    const body = (await readJsonBody(req)) as PurchaseBody;
    const result = await enqueue(() => settle(body));
    json(res, 200, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('settle failed:', message);
    json(res, 500, { error: message });
  }
});

async function settle(body: PurchaseBody): Promise<{ signature: string; lotIndex: number }> {
  if (!Number.isSafeInteger(body.spendCents) || body.spendCents <= 0) {
    throw new Error('spendCents must be a positive integer');
  }
  const owner = new PublicKey(body.owner);
  const brand = BRANDS.find((b) => b.key === body.brandKey);
  if (!brand) throw new Error(`Unknown brand ${body.brandKey}`);
  if (!brand.xstockSymbol) throw new Error(`No xStock mint for ${brand.name}`);
  if (!body.mint) throw new Error(`No xStock mint for ${brand.name}`);

  const stockMint = new PublicKey(body.mint);
  const configuredMint = devnetState?.mints[brand.xstockSymbol];
  if (configuredMint && configuredMint !== stockMint.toBase58()) {
    throw new Error(`Mint does not match configured ${brand.xstockSymbol}`);
  }
  const stockAmount = BigInt(body.stockAmount);
  if (stockAmount <= 0n) throw new Error('stockAmount must be positive');
  if (stockAmount > MAX_STOCK_AMOUNT) throw new Error('stockAmount exceeds demo settlement limit');

  const tx = new Transaction();

  // Fresh embedded/mock wallets have no devnet SOL. Sponsor enough for the
  // release transaction fee and the owner's destination ATA rent.
  const ownerBalance = await conn.getBalance(owner);
  if (ownerBalance < USER_SOL_TARGET) {
    tx.add(
      SystemProgram.transfer({
        fromPubkey: treasury.publicKey,
        toPubkey: owner,
        lamports: Math.ceil(USER_SOL_TARGET - ownerBalance),
      }),
    );
  }

  // First purchase for this wallet: open its ledger. The treasury pays rent.
  const state = await fetchUserState(conn, pid, owner);
  if (!state) {
    tx.add(ixInitUser(pid, owner, treasury.publicKey));
  }

  // Trust the chain's counter over the client's hint.
  const lotIndex = state?.lotCount ?? 0;

  tx.add(
    ixRecordPurchase({
      programId: pid,
      owner,
      funder: treasury.publicKey,
      stockMint,
      lotIndex,
      spendCents: BigInt(Math.round(body.spendCents)),
      stockAmount,
    }),
  );

  const signature = await sendAndConfirmTransaction(conn, tx, [treasury], { commitment: 'confirmed' });
  console.log(`settled ${brand.name} lot #${lotIndex} for ${owner.toBase58()} -> ${signature}`);
  return { signature, lotIndex };
}

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = settlementQueue.then(operation, operation);
  settlementQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of req) {
    length += (chunk as Buffer).length;
    if (length > 16_384) throw new Error('request body too large');
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

server.listen(PORT, () => {
  console.log(`PAFA settlement service on http://localhost:${PORT}`);
  console.log(`  program  ${pid.toBase58()}`);
  console.log(`  treasury ${treasury.publicKey.toBase58()}`);
  console.log(`\nSet VITE_PAFA_API=http://localhost:${PORT} in app/.env.local`);
});
