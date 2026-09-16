import { useMemo, useState, type ReactNode } from 'react';
import { Keypair, VersionedTransaction } from '@solana/web3.js';
import { AuthContext, type AuthState } from './context';
import type { PafaWallet } from '../solana/service';

const STORAGE_KEY = 'pafa.mock-session';

/**
 * Stand-in for Privy so the demo runs with no credentials.
 *
 * It mints a throwaway keypair per session and can genuinely sign — which means
 * the devnet path stays exercisable without a Privy app id, as long as the
 * keypair is funded. The session is remembered in localStorage so a reload
 * doesn't bounce you back to the login screen.
 */
export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // One keypair for the life of the tab.
  const keypair = useMemo(() => Keypair.generate(), []);

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
      handle: 'demo@pafa.app',
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
