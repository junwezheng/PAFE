import { createContext, useContext } from 'react';
import type { PafaWallet } from '../solana/service';

export type AuthMode = 'privy' | 'mock';

export interface AuthState {
  mode: AuthMode;
  /** The provider has finished booting. */
  ready: boolean;
  authenticated: boolean;
  /** Display name for the header avatar and profile row. */
  displayName: string;
  /** Email or login handle, when we have one. */
  handle: string | null;
  /** The user's Solana wallet, ready to sign. Null until one exists. */
  wallet: PafaWallet | null;
  login: () => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Build the initial from a name, for the header avatar. */
export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'J';
}
