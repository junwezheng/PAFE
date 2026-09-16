import { useEffect, useMemo, type ReactNode } from 'react';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { useSignTransaction, useSolanaWallets } from '@privy-io/react-auth/solana';
import { VersionedTransaction } from '@solana/web3.js';
import { AuthContext, type AuthState } from './context';
import { getConnection } from '../solana/service';
import type { PafaWallet } from '../solana/service';

/**
 * Real Privy. Loaded lazily and only when `VITE_PRIVY_APP_ID` is set, so the
 * offline demo never pays for the SDK.
 *
 * Login methods mirror what a consumer cashback app wants: email and Google for
 * people who don't know what a wallet is, plus an external wallet for those who
 * do. Everyone gets an embedded Solana wallet created on first login — that's
 * the account the vesting lots are derived from.
 */
export function PrivyAuthProvider({ appId, children }: { appId: string; children: ReactNode }) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'google', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#9945FF',
          logo: undefined,
          walletChainType: 'solana-only',
        },
        embeddedWallets: {
          solana: { createOnLogin: 'users-without-wallets' },
        },
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}

/** Maps Privy's hooks onto our provider-agnostic `AuthState`. */
function PrivyBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets, createWallet } = useSolanaWallets();
  const { signTransaction } = useSignTransaction();

  const solanaWallet = wallets[0] ?? null;

  // A user who signed in before embedded Solana wallets were enabled won't have
  // one yet; create it on the spot rather than dead-ending the flow.
  useEffect(() => {
    if (!ready || !authenticated || solanaWallet) return;
    createWallet().catch((err) => console.warn('[pafa] could not create embedded wallet', err));
  }, [ready, authenticated, solanaWallet, createWallet]);

  const wallet: PafaWallet | null = useMemo(() => {
    if (!solanaWallet) return null;
    return {
      address: solanaWallet.address,
      async signTransaction(tx: VersionedTransaction) {
        const connection = getConnection();
        if (!connection) throw new Error('No Solana RPC configured (VITE_SOLANA_RPC)');
        const signed = await signTransaction({
          transaction: tx,
          connection,
          address: solanaWallet.address,
        });
        return signed as VersionedTransaction;
      },
    };
  }, [solanaWallet, signTransaction]);

  const displayName =
    user?.google?.name ??
    user?.email?.address?.split('@')[0] ??
    (solanaWallet ? 'Wallet user' : 'Junwei L');

  const value: AuthState = useMemo(
    () => ({
      mode: 'privy',
      ready,
      authenticated,
      displayName,
      handle: user?.email?.address ?? user?.google?.email ?? null,
      wallet,
      login,
      logout,
    }),
    [ready, authenticated, displayName, user, wallet, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
