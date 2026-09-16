import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const KEYS_DIR = resolve(HERE, '../.keys');

export function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var ${name}. See app/.env.example.`);
  }
  return value;
}

export function connection(): Connection {
  return new Connection(env('SOLANA_RPC'), 'confirmed');
}

export function programId(): PublicKey {
  return new PublicKey(env('PAFA_PROGRAM_ID'));
}

/** Load a keypair from `.keys/<name>.json`, creating one if absent. */
export function loadOrCreateKeypair(name: string): Keypair {
  mkdirSync(KEYS_DIR, { recursive: true });
  const path = resolve(KEYS_DIR, `${name}.json`);

  if (existsSync(path)) {
    const secret = JSON.parse(readFileSync(path, 'utf8')) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(secret));
  }

  const kp = Keypair.generate();
  writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)));
  console.log(`Created new keypair ${name} -> ${path}`);
  return kp;
}

export function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}
