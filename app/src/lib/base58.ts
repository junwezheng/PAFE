const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Minimal base58 encoder — enough to render plausible transaction signatures in
 * the simulated adapter without pulling in another dependency.
 */
export function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';

  const digits: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  // Preserve leading zero bytes as leading '1's.
  let out = '';
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) out += ALPHABET[0];
  for (let i = digits.length - 1; i >= 0; i--) out += ALPHABET[digits[i]];
  return out;
}

/** A 64-byte random value rendered like a Solana signature. */
export function fakeSignature(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base58Encode(bytes);
}
