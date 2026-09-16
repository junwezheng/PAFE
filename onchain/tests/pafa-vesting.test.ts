/**
 * Instruction-level coverage for pafa_vesting.
 *
 * Sends the hand-rolled builders in `app/src/solana/program.ts` at a compiled
 * SBF binary. Account-meta order is the thing those builders can get wrong
 * silently, so this file is also the runtime check for that.
 *
 * Clock-dependent cases (14-day cliff, calendar-month waiver reset) run in
 * LiteSVM because `solana-test-validator` has no RPC to overwrite unix_timestamp.
 * `anchor test` still builds, deploys to a local validator, then runs these.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Clock, FailedTransactionMetadata, LiteSVM } from 'litesvm';
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  type TransactionInstruction,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AccountLayout,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  assertDiscriminators,
  configPda,
  decodeConfig,
  decodeLot,
  decodeUserState,
  ixInitUser,
  ixInitializeConfig,
  ixRecordPurchase,
  ixReleaseLot,
  ixSetParams,
  ixWaiveLot,
  lotEscrow,
  lotPda,
  userStatePda,
} from '../../app/src/solana/program';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROGRAM_SO = resolveSo();
const PROGRAM_ID = programIdFromArtifacts();

const SECONDS_PER_DAY = 86_400;
const SEPT_16_2026 = 1_789_516_800; // 2026-09-16T00:00:00Z — same as the Rust unit tests
const SEPT_20_2026 = SEPT_16_2026 + 4 * SECONDS_PER_DAY;
const OCT_1_2026 = 1_790_812_800; // 2026-10-01T00:00:00Z
const DECIMALS = 8;
const STOCK_AMOUNT = 1_000_000n;
const SEPT_2026_KEY = 2026 * 12 + 8;
const OCT_2026_KEY = 2026 * 12 + 9;

function resolveSo(): string {
  const candidates = [
    resolve(HERE, '../target/deploy/pafa_vesting.so'),
    resolve(process.env.CARGO_TARGET_DIR ?? '', 'deploy/pafa_vesting.so'),
  ];
  const found = candidates.find((p) => p.endsWith('.so') && existsSync(p));
  if (!found) {
    throw new Error('pafa_vesting.so not found — run `anchor build` first');
  }
  return found;
}

function programIdFromArtifacts(): PublicKey {
  const idlPath = resolve(HERE, '../target/idl/pafa_vesting.json');
  if (existsSync(idlPath)) {
    const idl = JSON.parse(readFileSync(idlPath, 'utf8')) as { address: string };
    return new PublicKey(idl.address);
  }
  const kpPath = resolve(HERE, '../target/deploy/pafa_vesting-keypair.json');
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(kpPath, 'utf8')))).publicKey;
}

function setUnix(svm: LiteSVM, ts: number) {
  const c = svm.getClock();
  svm.setClock(new Clock(c.slot, c.epochStartTimestamp, c.epoch, c.leaderScheduleEpoch, BigInt(ts)));
}

function send(
  svm: LiteSVM,
  ixs: TransactionInstruction | TransactionInstruction[],
  signers: Keypair[],
) {
  svm.expireBlockhash();
  const tx = new Transaction();
  tx.recentBlockhash = svm.latestBlockhash();
  tx.feePayer = signers[0].publicKey;
  for (const ix of Array.isArray(ixs) ? ixs : [ixs]) tx.add(ix);
  tx.sign(...signers);
  return svm.sendTransaction(tx);
}

function sendOk(
  svm: LiteSVM,
  ixs: TransactionInstruction | TransactionInstruction[],
  signers: Keypair[],
) {
  const result = send(svm, ixs, signers);
  if (result instanceof FailedTransactionMetadata) {
    throw new Error(`tx failed:\n${result.meta().prettyLogs()}`);
  }
  return result;
}

function sendErr(
  svm: LiteSVM,
  ixs: TransactionInstruction | TransactionInstruction[],
  signers: Keypair[],
  code: string,
) {
  const result = send(svm, ixs, signers);
  assert.ok(result instanceof FailedTransactionMetadata, `expected ${code}, tx succeeded`);
  const logs = result.meta().logs().join('\n');
  assert.ok(
    logs.includes(`Error Code: ${code}`) || logs.includes(code),
    `expected ${code} in logs:\n${logs}`,
  );
  return result;
}

function tokenAmount(svm: LiteSVM, ata: PublicKey): bigint {
  const info = svm.getAccount(ata);
  assert.ok(info, `missing token account ${ata.toBase58()}`);
  return AccountLayout.decode(info.data).amount;
}

interface World {
  svm: LiteSVM;
  authority: Keypair;
  owner: Keypair;
  mint: PublicKey;
}

function boot(opts: { now?: number; vestingDays?: number; targetCents?: bigint } = {}): World {
  const now = opts.now ?? SEPT_16_2026;
  const vestingDays = opts.vestingDays ?? 14;
  const targetCents = opts.targetCents ?? 100_000n;

  const svm = new LiteSVM();
  svm.addProgramFromFile(PROGRAM_ID, PROGRAM_SO);

  const authority = Keypair.generate();
  const owner = Keypair.generate();
  svm.airdrop(authority.publicKey, 10_000_000_000n);
  svm.airdrop(owner.publicKey, 10_000_000_000n);
  setUnix(svm, now);

  const mintKp = Keypair.generate();
  const mintRent = Number(svm.minimumBalanceForRentExemption(BigInt(MINT_SIZE)));
  sendOk(
    svm,
    [
      SystemProgram.createAccount({
        fromPubkey: authority.publicKey,
        newAccountPubkey: mintKp.publicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMint2Instruction(mintKp.publicKey, DECIMALS, authority.publicKey, null),
    ],
    [authority, mintKp],
  );

  const funderAta = getAssociatedTokenAddressSync(mintKp.publicKey, authority.publicKey);
  sendOk(
    svm,
    [
      createAssociatedTokenAccountIdempotentInstruction(
        authority.publicKey,
        funderAta,
        authority.publicKey,
        mintKp.publicKey,
      ),
      createMintToInstruction(mintKp.publicKey, funderAta, authority.publicKey, 1_000_000_000_000n),
    ],
    [authority],
  );

  sendOk(
    svm,
    ixInitializeConfig(PROGRAM_ID, authority.publicKey, vestingDays, targetCents, 350),
    [authority],
  );
  sendOk(svm, ixInitUser(PROGRAM_ID, owner.publicKey, authority.publicKey), [authority]);

  return { svm, authority, owner, mint: mintKp.publicKey };
}

function record(w: World, lotIndex: number, spendCents: bigint, stockAmount: bigint = STOCK_AMOUNT) {
  sendOk(
    w.svm,
    ixRecordPurchase({
      programId: PROGRAM_ID,
      owner: w.owner.publicKey,
      funder: w.authority.publicKey,
      stockMint: w.mint,
      lotIndex,
      spendCents,
      stockAmount,
    }),
    [w.authority],
  );
}

function release(w: World, lotIndex: number) {
  return ixReleaseLot({
    programId: PROGRAM_ID,
    owner: w.owner.publicKey,
    mint: w.mint,
    lotIndex,
  });
}

function user(w: World) {
  const info = w.svm.getAccount(userStatePda(PROGRAM_ID, w.owner.publicKey));
  assert.ok(info);
  return decodeUserState(info.data);
}

function lot(w: World, index: number) {
  const info = w.svm.getAccount(lotPda(PROGRAM_ID, w.owner.publicKey, index));
  assert.ok(info);
  return decodeLot(info.data);
}

describe('program.ts matches the IDL wire format', () => {
  it('discriminators re-derive to the constants', async () => {
    await assertDiscriminators();
  });

  it('account-meta writable/signer flags match each Accounts struct', () => {
    const pk = () => Keypair.generate().publicKey;
    const programId = pk();
    const authority = pk();
    const owner = pk();
    const payer = pk();
    const funder = pk();
    const mint = pk();

    const flags = (ix: TransactionInstruction) =>
      ix.keys.map((k) => ({ writable: k.isWritable, signer: k.isSigner }));

    assert.deepEqual(flags(ixInitializeConfig(programId, authority, 14, 100_000n, 350)), [
      { writable: true, signer: false },
      { writable: true, signer: true },
      { writable: false, signer: false },
    ]);
    assert.deepEqual(flags(ixSetParams(programId, authority, 14, 100_000n, 350)), [
      { writable: true, signer: false },
      { writable: false, signer: true },
    ]);
    assert.deepEqual(flags(ixInitUser(programId, owner, payer)), [
      { writable: true, signer: false },
      { writable: false, signer: false },
      { writable: true, signer: true },
      { writable: false, signer: false },
    ]);
    assert.deepEqual(
      flags(
        ixRecordPurchase({
          programId,
          owner,
          funder,
          stockMint: mint,
          lotIndex: 0,
          spendCents: 1n,
          stockAmount: 1n,
        }),
      ),
      [
        { writable: false, signer: false },
        { writable: true, signer: false },
        { writable: true, signer: false },
        { writable: false, signer: false },
        { writable: true, signer: false },
        { writable: true, signer: false },
        { writable: true, signer: true },
        { writable: false, signer: false },
        { writable: false, signer: false },
        { writable: false, signer: false },
      ],
    );
    assert.deepEqual(flags(ixWaiveLot(programId, owner, 0)), [
      { writable: false, signer: false },
      { writable: true, signer: false },
      { writable: false, signer: true },
    ]);
    assert.deepEqual(flags(ixReleaseLot({ programId, owner, mint, lotIndex: 0 })), [
      { writable: false, signer: false },
      { writable: true, signer: false },
      { writable: false, signer: false },
      { writable: true, signer: false },
      { writable: true, signer: false },
      { writable: true, signer: true },
      { writable: false, signer: false },
      { writable: false, signer: false },
      { writable: false, signer: false },
    ]);
  });

  it('record_purchase includes the token, ATA, and system programs in struct order', () => {
    const rec = ixRecordPurchase({
      programId: Keypair.generate().publicKey,
      owner: Keypair.generate().publicKey,
      funder: Keypair.generate().publicKey,
      stockMint: Keypair.generate().publicKey,
      lotIndex: 0,
      spendCents: 1n,
      stockAmount: 1n,
    });
    assert.equal(rec.keys[7].pubkey.toBase58(), TOKEN_PROGRAM_ID.toBase58());
    assert.equal(rec.keys[8].pubkey.toBase58(), ASSOCIATED_TOKEN_PROGRAM_ID.toBase58());
    assert.equal(rec.keys[9].pubkey.toBase58(), SystemProgram.programId.toBase58());
  });
});

describe('initialize_config / set_params / init_user', () => {
  it('writes the economics and the authority', () => {
    const w = boot({ vestingDays: 14, targetCents: 100_000n });
    const info = w.svm.getAccount(configPda(PROGRAM_ID));
    assert.ok(info);
    const cfg = decodeConfig(info.data);
    assert.equal(cfg.authority.toBase58(), w.authority.publicKey.toBase58());
    assert.equal(cfg.vestingDays, 14);
    assert.equal(cfg.monthlySpendTargetCents, 100_000n);
    assert.equal(cfg.cashbackBps, 350);
  });

  it('rejects a second initialize', () => {
    const w = boot();
    sendErr(
      w.svm,
      ixInitializeConfig(PROGRAM_ID, w.authority.publicKey, 14, 100_000n, 350),
      [w.authority],
      'already in use',
    );
  });

  it('lets the authority retune, and nobody else', () => {
    const w = boot();
    sendOk(w.svm, ixSetParams(PROGRAM_ID, w.authority.publicKey, 30, 200_000n, 500), [w.authority]);
    const cfg = decodeConfig(w.svm.getAccount(configPda(PROGRAM_ID))!.data);
    assert.equal(cfg.vestingDays, 30);
    assert.equal(cfg.monthlySpendTargetCents, 200_000n);
    assert.equal(cfg.cashbackBps, 500);

    sendErr(w.svm, ixSetParams(PROGRAM_ID, w.owner.publicKey, 1, 1n, 1), [w.owner], 'ConstraintHasOne');
  });

  it('rejects cashback above 100%', () => {
    const w = boot();
    sendErr(
      w.svm,
      ixSetParams(PROGRAM_ID, w.authority.publicKey, 14, 100_000n, 10_001),
      [w.authority],
      'InvalidCashbackRate',
    );
  });

  it('opens a user ledger on the current calendar month', () => {
    const w = boot({ now: SEPT_16_2026 });
    const state = user(w);
    assert.equal(state.owner.toBase58(), w.owner.publicKey.toBase58());
    assert.equal(state.monthSpendCents, 0n);
    assert.equal(state.lotCount, 0);
    assert.equal(state.vestingWaived, false);
    assert.equal(state.monthKey, SEPT_2026_KEY);
  });
});

describe('record_purchase', () => {
  it('escrows stock into a lot PDA and stamps a 14-day unlock', () => {
    const w = boot({ now: SEPT_16_2026, vestingDays: 14 });
    record(w, 0, 5_000n);

    const state = user(w);
    assert.equal(state.lotCount, 1);
    assert.equal(state.monthSpendCents, 5_000n);
    assert.equal(state.lifetimeSpendCents, 5_000n);
    assert.equal(state.vestingWaived, false);

    const l = lot(w, 0);
    assert.equal(l.owner.toBase58(), w.owner.publicKey.toBase58());
    assert.equal(l.mint.toBase58(), w.mint.toBase58());
    assert.equal(l.index, 0);
    assert.equal(l.amount, STOCK_AMOUNT);
    assert.equal(l.earnedAt, SEPT_16_2026 * 1000);
    assert.equal(l.unlockAt, (SEPT_16_2026 + 14 * SECONDS_PER_DAY) * 1000);
    assert.equal(l.monthKey, SEPT_2026_KEY);
    assert.equal(l.released, false);

    const escrow = lotEscrow(w.mint, lotPda(PROGRAM_ID, w.owner.publicKey, 0));
    assert.equal(tokenAmount(w.svm, escrow), STOCK_AMOUNT);
  });

  it('rejects an empty lot and a mismatched lot index', () => {
    const w = boot();
    sendErr(
      w.svm,
      ixRecordPurchase({
        programId: PROGRAM_ID,
        owner: w.owner.publicKey,
        funder: w.authority.publicKey,
        stockMint: w.mint,
        lotIndex: 0,
        spendCents: 1n,
        stockAmount: 0n,
      }),
      [w.authority],
      'EmptyLot',
    );
    sendErr(
      w.svm,
      ixRecordPurchase({
        programId: PROGRAM_ID,
        owner: w.owner.publicKey,
        funder: w.authority.publicKey,
        stockMint: w.mint,
        lotIndex: 7,
        spendCents: 1n,
        stockAmount: STOCK_AMOUNT,
      }),
      [w.authority],
      'LotIndexMismatch',
    );
  });
});

describe('14-day cliff', () => {
  it('blocks release before unlock_at and allows it after a clock warp', () => {
    const w = boot({ now: SEPT_16_2026, vestingDays: 14 });
    record(w, 0, 5_000n);

    sendErr(w.svm, release(w, 0), [w.owner], 'StillVesting');

    setUnix(w.svm, SEPT_16_2026 + 14 * SECONDS_PER_DAY - 1);
    sendErr(w.svm, release(w, 0), [w.owner], 'StillVesting');

    setUnix(w.svm, SEPT_16_2026 + 14 * SECONDS_PER_DAY);
    sendOk(w.svm, release(w, 0), [w.owner]);

    const ownerAta = getAssociatedTokenAddressSync(w.mint, w.owner.publicKey);
    assert.equal(tokenAmount(w.svm, ownerAta), STOCK_AMOUNT);
    assert.equal(w.svm.getAccount(lotEscrow(w.mint, lotPda(PROGRAM_ID, w.owner.publicKey, 0))), null);
    assert.equal(lot(w, 0).released, true);

    sendErr(w.svm, release(w, 0), [w.owner], 'AccountNotInitialized');
    sendErr(w.svm, ixWaiveLot(PROGRAM_ID, w.owner.publicKey, 0), [w.owner], 'LotAlreadyReleased');
  });
});

describe('same-month spend-target waiver', () => {
  it('lets release_lot skip the cliff once the month hits the target', () => {
    const w = boot({ now: SEPT_16_2026, vestingDays: 14, targetCents: 100_000n });
    record(w, 0, 40_000n);
    record(w, 1, 70_000n);

    const state = user(w);
    assert.equal(state.vestingWaived, true);
    assert.equal(state.monthSpendCents, 110_000n);

    sendOk(w.svm, release(w, 0), [w.owner]);
    const ownerAta = getAssociatedTokenAddressSync(w.mint, w.owner.publicKey);
    assert.equal(tokenAmount(w.svm, ownerAta), STOCK_AMOUNT);
  });

  it('waive_lot refuses when the target has not been met', () => {
    const w = boot({ targetCents: 100_000n });
    record(w, 0, 5_000n);
    sendErr(w.svm, ixWaiveLot(PROGRAM_ID, w.owner.publicKey, 0), [w.owner], 'SpendTargetNotMet');
  });
});

describe('month-rollover waiver reset', () => {
  // Sept 20 + 14-day cliff = Oct 4, so warping to Oct 1 is still pre-cliff.
  it('resets the live waiver on the 1st; waive_lot is what pins a lot across the boundary', () => {
    const w = boot({ now: SEPT_20_2026, vestingDays: 14, targetCents: 100_000n });
    record(w, 0, 40_000n);
    record(w, 1, 70_000n);
    assert.equal(user(w).vestingWaived, true);
    assert.equal(lot(w, 0).monthKey, SEPT_2026_KEY);

    sendOk(w.svm, ixWaiveLot(PROGRAM_ID, w.owner.publicKey, 0), [w.owner]);
    assert.equal(lot(w, 0).unlockAt, SEPT_20_2026 * 1000);
    assert.equal(lot(w, 1).unlockAt, (SEPT_20_2026 + 14 * SECONDS_PER_DAY) * 1000);

    setUnix(w.svm, OCT_1_2026);
    record(w, 2, 1_000n);

    const state = user(w);
    assert.equal(state.monthKey, OCT_2026_KEY);
    assert.equal(state.monthSpendCents, 1_000n);
    assert.equal(state.vestingWaived, false);
    assert.equal(state.lotCount, 3);

    sendOk(w.svm, release(w, 0), [w.owner]);
    sendErr(w.svm, release(w, 1), [w.owner], 'StillVesting');
    sendErr(w.svm, ixWaiveLot(PROGRAM_ID, w.owner.publicKey, 1), [w.owner], 'SpendTargetNotMet');

    // Hitting October's target does not resurrect the waiver for September lots.
    record(w, 3, 100_000n);
    assert.equal(user(w).vestingWaived, true);
    sendErr(w.svm, ixWaiveLot(PROGRAM_ID, w.owner.publicKey, 1), [w.owner], 'WaiverMonthMismatch');
    sendOk(w.svm, release(w, 2), [w.owner]);
  });
});
