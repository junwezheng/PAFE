import { Suspense, lazy, type ReactNode } from 'react';
import { MockAuthProvider } from './MockAuthProvider';
import type { AuthMode } from './context';

const PRIVY_APP_ID: string = import.meta.env.VITE_PRIVY_APP_ID ?? '';

/** Fixed at build time, so the hook order below is never conditional. */
export const AUTH_MODE: AuthMode = PRIVY_APP_ID ? 'privy' : 'mock';

const PrivyAuthProvider = lazy(() =>
  import('./PrivyAuthProvider').then((m) => ({ default: m.PrivyAuthProvider })),
);

/**
 * Picks the auth backend. Real Privy when an app id is configured, otherwise a
 * local mock so the demo still runs end-to-end with no credentials.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (AUTH_MODE === 'privy') {
    return (
      <Suspense fallback={<Booting />}>
        <PrivyAuthProvider appId={PRIVY_APP_ID}>{children}</PrivyAuthProvider>
      </Suspense>
    );
  }
  return <MockAuthProvider>{children}</MockAuthProvider>;
}

function Booting() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#06060B',
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: '2px solid rgba(153,69,255,.25)',
          borderTopColor: '#14F195',
          animation: 'pafaSpin .7s linear infinite',
        }}
      />
    </div>
  );
}
