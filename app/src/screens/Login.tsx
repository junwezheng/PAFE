import { C, SORA } from '../theme';
import { Cta } from '../components/Bits';
import { useAuth } from '../auth/context';

/**
 * Sign-in. Privy handles email / Google / external wallet and provisions an
 * embedded Solana wallet — that's the account every vesting lot is derived
 * from, so it has to exist before the flow starts.
 */
export function Login() {
  const { login, mode, ready } = useAuth();

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: C.bg,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '0 24px 64px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -140,
          left: -60,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(153,69,255,.28),transparent 68%)',
          filter: 'blur(10px)',
          pointerEvents: 'none',
          animation: 'pafaGlow 9s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -90,
          right: -110,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(20,241,149,.16),transparent 70%)',
          filter: 'blur(10px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: `linear-gradient(140deg,${C.green},${C.cyan} 45%,${C.purple})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: SORA,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: '.04em',
            color: C.bg,
          }}
        >
          P
        </div>

        <div
          style={{
            marginTop: 24,
            fontFamily: SORA,
            fontWeight: 600,
            fontSize: 34,
            lineHeight: 1.15,
            letterSpacing: '-.02em',
            color: C.white,
          }}
        >
          Own a piece
          <br />
          of what you buy.
        </div>
        <div style={{ marginTop: 14, fontSize: 14.5, lineHeight: 1.55, color: C.muted, maxWidth: 300 }}>
          Every purchase pays you back in that brand&rsquo;s stock — tokenised on Solana, held in your own wallet, and
          unlocking real shareholder perks.
        </div>

        <Cta onClick={login} style={{ marginTop: 32 }} fontSize={15.5}>
          {ready ? 'Get started' : 'Loading…'}
        </Cta>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: C.gray }}>
          {mode === 'privy'
            ? 'Continue with email, Google or an existing wallet. Powered by Privy.'
            : 'Demo mode — no Privy app id configured, so this creates a throwaway local wallet.'}
        </div>
      </div>
    </div>
  );
}
