import { useMemo, useState, type ReactNode } from 'react';
import { Keypair, VersionedTransaction } from '@solana/web3.js';
import { AuthContext, type AuthState } from './context';
import type { PafaWallet } from '../solana/service';

const STORAGE_KEY = 'pafa.mock-session';
const WALLET_STORAGE_KEY = 'pafa.mock-wallet';

function loadOrCreateWallet(): Keypair {
  try {
    const saved = localStorage.getItem(WALLET_STORAGE_KEY);
    if (saved) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(saved) as number[]));
    }
    const created = Keypair.generate();
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(Array.from(created.secretKey)));
    return created;
  } catch {
    return Keypair.generate();
  }
}

/**
 * Stand-in for Privy so the demo runs with no credentials.
 *
 * It keeps a throwaway keypair in localStorage and can genuinely sign — which means
 * the devnet path stays exercisable without a Privy app id, as long as the
 * settlement service sponsors its transaction fees. This is demo-only key
 * storage; production always uses Privy's embedded wallet.
 */
export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Stable across reloads so existing user/lot PDAs remain reachable.
  const keypair = useMemo(loadOrCreateWallet, []);

  const wallet: PafaWallet = useMemo(
    () => ({
      address: keypair.publicKey.toBase58(),
      async signTransaction(tx: VersionedTransaction) {
        tx.sign([keypair]);
        return tx;
      },
    }),
    [keypair],
  );

  const value: AuthState = useMemo(
    () => ({
      mode: 'mock',
      ready: true,
      authenticated,
      displayName: 'Junwei L',
      handle: 'demo@pafe.app',
      wallet: authenticated ? wallet : null,
      login: () => {
        setAuthenticated(true);
        try {
          localStorage.setItem(STORAGE_KEY, 'true');
        } catch {
          /* private mode — session just won't persist */
        }
      },
      logout: () => {
        setAuthenticated(false);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      },
    }),
    [authenticated, wallet],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
