import { Buffer } from 'buffer';

// @solana/spl-token (and program.ts) reach for a global Buffer that browsers
// don't provide. This module must be imported before any Solana code.
globalThis.Buffer = Buffer;
