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
import { PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { BRANDS } from '../../app/src/domain/brands';
import { fetchUserState, ixInitUser, ixRecordPurchase } from '../../app/src/solana/program';
import { connection, loadOrCreateKeypair, programId } from './shared';

const PORT = Number(process.env.PORT ?? 8787);

interface PurchaseBody {
  owner: string;
  brandKey: string;
  spendCents: number;
  stockAmount: string;
  mint: string | null;
  lotIndex?: number;
}

const conn = connection();
const pid = programId();
const treasury = loadOrCreateKeypair('treasury');

const server = createServer(async (req, res) => {
  // Browser calls this cross-origin from the Vite dev server.
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }
  if (req.method !== 'POST' || !req.url?.endsWith('/purchase')) {
    json(res, 404, { error: 'POST /purchase only' });
    return;
  }

  try {
    const body = (await readJsonBody(req)) as PurchaseBody;
    const signature = await settle(body);
    json(res, 200, { signature });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('settle failed:', message);
    json(res, 500, { error: message });
  }
});

async function settle(body: PurchaseBody): Promise<string> {
  const owner = new PublicKey(body.owner);
  const brand = BRANDS.find((b) => b.key === body.brandKey);
  if (!brand) throw new Error(`Unknown brand ${body.brandKey}`);
  if (!body.mint) throw new Error(`No xStock mint for ${brand.name}`);

  const stockMint = new PublicKey(body.mint);
  const stockAmount = BigInt(body.stockAmount);
  if (stockAmount <= 0n) throw new Error('stockAmount must be positive');

  const tx = new Transaction();

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
  return signature;
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

server.listen(PORT, () => {
  console.log(`PAFA settlement service on http://localhost:${PORT}`);
  console.log(`  program  ${pid.toBase58()}`);
  console.log(`  treasury ${treasury.publicKey.toBase58()}`);
  console.log(`\nSet VITE_PAFA_API=http://localhost:${PORT} in app/.env.local`);
});
