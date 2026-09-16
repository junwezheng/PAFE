/**
 * Hand-rolled client for the `pafa_vesting` Anchor program.
 *
 * Deliberately IDL-free: Anchor's on-wire format is fully determined by the
 * program source, so encoding it directly keeps the browser bundle small and
 * removes a build step (`anchor build`) from the critical path. The program
 * still emits a normal IDL at `onchain/target/idl/pafa_vesting.json` for any
 * other tooling that wants it.
 *
 * Discriminators are `sha256("global:<ix_name>")[0..8]` and
 * `sha256("account:<AccountName>")[0..8]`, per Anchor. The constants below were
 * generated from the instruction names in `onchain/programs/pafa-vesting/src/lib.rs`;
 * `assertDiscriminators()` re-derives them at runtime in dev so they can't drift.
 */
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  type AccountMeta,
  type Connection,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';

export const CONFIG_SEED = new TextEncoder().encode('config');
export const USER_SEED = new TextEncoder().encode('user');
export const LOT_SEED = new TextEncoder().encode('lot');

export const IX_DISCRIMINATOR = {
  initialize_config: [208, 127, 21, 1, 194, 190, 196, 70],
  set_params: [27, 234, 178, 52, 147, 2, 187, 141],
  init_user: [14, 51, 68, 159, 237, 78, 158, 102],
  record_purchase: [107, 25, 137, 125, 231, 17, 11, 60],
  waive_lot: [104, 186, 56, 37, 14, 181, 189, 19],
  release_lot: [198, 174, 135, 170, 13, 162, 43, 154],
} as const;

export const ACCOUNT_DISCRIMINATOR = {
  Config: [155, 12, 170, 224, 30, 250, 204, 130],
  UserState: [72, 177, 85, 249, 76, 167, 186, 126],
  VestingLot: [3, 156, 186, 5, 163, 125, 243, 182],
} as const;

// ─────────────────────────────────────────────────────────────
// Little-endian scalar encoding (Borsh for these types is just LE)
// ─────────────────────────────────────────────────────────────

function u16le(v: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, v, true);
  return b;
}

export function u64le(v: bigint | number): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, BigInt(v), true);
  return b;
}

function concat(...parts: (Uint8Array | readonly number[])[]): Buffer {
  const arrays = parts.map((p) => (p instanceof Uint8Array ? p : Uint8Array.from(p)));
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return Buffer.from(out);
}

// ─────────────────────────────────────────────────────────────
// PDAs
// ─────────────────────────────────────────────────────────────

export function configPda(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], programId)[0];
}

export function userStatePda(programId: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([USER_SEED, owner.toBytes()], programId)[0];
}

export function lotPda(programId: PublicKey, owner: PublicKey, index: number | bigint): PublicKey {
  return PublicKey.findProgramAddressSync([LOT_SEED, owner.toBytes(), u64le(index)], programId)[0];
}

/** The lot's escrow is an ATA owned by the lot PDA itself. */
export function lotEscrow(mint: PublicKey, lot: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(mint, lot, true);
}

// ─────────────────────────────────────────────────────────────
// Account decoding
// ─────────────────────────────────────────────────────────────

class Reader {
  private view: DataView;
  constructor(private data: Uint8Array, private offset = 0) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }
  skip(n: number) {
    this.offset += n;
    return this;
  }
  pubkey(): PublicKey {
    const key = new PublicKey(this.data.subarray(this.offset, this.offset + 32));
    this.offset += 32;
    return key;
  }
  u16(): number {
    const v = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return v;
  }
  u32(): number {
    const v = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return v;
  }
  u64(): bigint {
    const v = this.view.getBigUint64(this.offset, true);
    this.offset += 8;
    return v;
  }
  i64(): bigint {
    const v = this.view.getBigInt64(this.offset, true);
    this.offset += 8;
    return v;
  }
  bool(): boolean {
    return this.u8() === 1;
  }
  u8(): number {
    const v = this.view.getUint8(this.offset);
    this.offset += 1;
    return v;
  }
}

export interface OnChainConfig {
  authority: PublicKey;
  vestingDays: number;
  monthlySpendTargetCents: bigint;
  cashbackBps: number;
}

export function decodeConfig(data: Uint8Array): OnChainConfig {
  const r = new Reader(data).skip(8);
  return {
    authority: r.pubkey(),
    vestingDays: r.u16(),
    monthlySpendTargetCents: r.u64(),
    cashbackBps: r.u16(),
  };
}

export interface OnChainUserState {
  owner: PublicKey;
  monthKey: number;
  monthSpendCents: bigint;
  lifetimeSpendCents: bigint;
  vestingWaived: boolean;
  lotCount: number;
}

export function decodeUserState(data: Uint8Array): OnChainUserState {
  const r = new Reader(data).skip(8);
  return {
    owner: r.pubkey(),
    monthKey: r.u32(),
    monthSpendCents: r.u64(),
    lifetimeSpendCents: r.u64(),
    vestingWaived: r.bool(),
    lotCount: Number(r.u64()),
  };
}

export interface OnChainLot {
  owner: PublicKey;
  mint: PublicKey;
  index: number;
  amount: bigint;
  earnedAt: number;
  unlockAt: number;
  monthKey: number;
  released: boolean;
}

export function decodeLot(data: Uint8Array): OnChainLot {
  const r = new Reader(data).skip(8);
  return {
    owner: r.pubkey(),
    mint: r.pubkey(),
    index: Number(r.u64()),
    amount: r.u64(),
    earnedAt: Number(r.i64()) * 1000,
    unlockAt: Number(r.i64()) * 1000,
    monthKey: r.u32(),
    released: r.bool(),
  };
}

// ─────────────────────────────────────────────────────────────
// Instruction builders — meta order mirrors the #[derive(Accounts)] structs
// ─────────────────────────────────────────────────────────────

const ro = (pubkey: PublicKey): AccountMeta => ({ pubkey, isSigner: false, isWritable: false });
const rw = (pubkey: PublicKey): AccountMeta => ({ pubkey, isSigner: false, isWritable: true });
const signer = (pubkey: PublicKey, isWritable = false): AccountMeta => ({ pubkey, isSigner: true, isWritable });

export function ixInitializeConfig(
  programId: PublicKey,
  authority: PublicKey,
  vestingDays: number,
  monthlySpendTargetCents: bigint,
  cashbackBps: number,
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [rw(configPda(programId)), signer(authority, true), ro(SystemProgram.programId)],
    data: concat(
      IX_DISCRIMINATOR.initialize_config,
      u16le(vestingDays),
      u64le(monthlySpendTargetCents),
      u16le(cashbackBps),
    ),
  });
}

export function ixSetParams(
  programId: PublicKey,
  authority: PublicKey,
  vestingDays: number,
  monthlySpendTargetCents: bigint,
  cashbackBps: number,
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [rw(configPda(programId)), signer(authority)],
    data: concat(IX_DISCRIMINATOR.set_params, u16le(vestingDays), u64le(monthlySpendTargetCents), u16le(cashbackBps)),
  });
}

export function ixInitUser(programId: PublicKey, owner: PublicKey, payer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [rw(userStatePda(programId, owner)), ro(owner), signer(payer, true), ro(SystemProgram.programId)],
    data: concat(IX_DISCRIMINATOR.init_user),
  });
}

export function ixRecordPurchase(params: {
  programId: PublicKey;
  owner: PublicKey;
  funder: PublicKey;
  stockMint: PublicKey;
  lotIndex: number;
  spendCents: bigint;
  stockAmount: bigint;
}): TransactionInstruction {
  const { programId, owner, funder, stockMint, lotIndex, spendCents, stockAmount } = params;
  const lot = lotPda(programId, owner, lotIndex);
  return new TransactionInstruction({
    programId,
    keys: [
      ro(configPda(programId)),
      rw(userStatePda(programId, owner)),
      rw(lot),
      ro(stockMint),
      rw(lotEscrow(stockMint, lot)),
      rw(getAssociatedTokenAddressSync(stockMint, funder)),
      signer(funder, true),
      ro(TOKEN_PROGRAM_ID),
      ro(ASSOCIATED_TOKEN_PROGRAM_ID),
      ro(SystemProgram.programId),
    ],
    data: concat(IX_DISCRIMINATOR.record_purchase, u64le(lotIndex), u64le(spendCents), u64le(stockAmount)),
  });
}

export function ixWaiveLot(programId: PublicKey, owner: PublicKey, lotIndex: number): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [
      ro(userStatePda(programId, owner)),
      rw(lotPda(programId, owner, lotIndex)),
      signer(owner),
    ],
    data: concat(IX_DISCRIMINATOR.waive_lot, u64le(lotIndex)),
  });
}

export function ixReleaseLot(params: {
  programId: PublicKey;
  owner: PublicKey;
  mint: PublicKey;
  lotIndex: number;
}): TransactionInstruction {
  const { programId, owner, mint, lotIndex } = params;
  const lot = lotPda(programId, owner, lotIndex);
  return new TransactionInstruction({
    programId,
    keys: [
      ro(userStatePda(programId, owner)),
      rw(lot),
      ro(mint),
      rw(lotEscrow(mint, lot)),
      rw(getAssociatedTokenAddressSync(mint, owner)),
      signer(owner, true),
      ro(TOKEN_PROGRAM_ID),
      ro(ASSOCIATED_TOKEN_PROGRAM_ID),
      ro(SystemProgram.programId),
    ],
    data: concat(IX_DISCRIMINATOR.release_lot, u64le(lotIndex)),
  });
}

// ─────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────

export async function fetchUserState(
  connection: Connection,
  programId: PublicKey,
  owner: PublicKey,
): Promise<OnChainUserState | null> {
  const info = await connection.getAccountInfo(userStatePda(programId, owner));
  return info ? decodeUserState(info.data) : null;
}

export async function fetchLots(
  connection: Connection,
  programId: PublicKey,
  owner: PublicKey,
  lotCount: number,
): Promise<OnChainLot[]> {
  if (lotCount === 0) return [];
  const addresses = Array.from({ length: lotCount }, (_, i) => lotPda(programId, owner, i));
  const infos = await connection.getMultipleAccountsInfo(addresses);
  return infos.flatMap((info) => (info ? [decodeLot(info.data)] : []));
}

/**
 * Re-derives every discriminator and throws if a constant has gone stale —
 * the one failure mode of hand-encoding that a type system can't catch.
 * Dev-only; uses WebCrypto so it stays async and out of the hot path.
 */
export async function assertDiscriminators(): Promise<void> {
  const sha8 = async (preimage: string) => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(preimage));
    return Array.from(new Uint8Array(digest).subarray(0, 8));
  };
  const check = async (preimage: string, expected: readonly number[]) => {
    const actual = await sha8(preimage);
    if (actual.join(',') !== expected.join(',')) {
      throw new Error(`[pafa] Stale discriminator for "${preimage}": expected ${expected}, got ${actual}`);
    }
  };
  await Promise.all([
    ...Object.entries(IX_DISCRIMINATOR).map(([name, d]) => check(`global:${name}`, d)),
    ...Object.entries(ACCOUNT_DISCRIMINATOR).map(([name, d]) => check(`account:${name}`, d)),
  ]);
}
