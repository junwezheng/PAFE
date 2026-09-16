import { C, SORA } from '../theme';
import { Eyebrow, SectionTitle } from '../components/Bits';
import { TxRow } from '../components/TxRow';
import { useAuth } from '../auth/context';
import { shortAddress } from '../lib/format';
import type { ScreenProps } from './types';

/** Virtual card + settings. The wallet row shows the Privy embedded address. */
export function CardScreen({ vm, actions }: ScreenProps) {
  const { wallet, displayName, mode, logout } = useAuth();

  return (
    <div>
      <div
        style={{
          borderRadius: 24,
          padding: 22,
          background: `linear-gradient(135deg,${C.green} 0%,${C.cyan} 38%,${C.purple} 100%)`,
          position: 'relative',
          overflow: 'hidden',
          aspectRatio: '1.6',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(200deg,rgba(255,255,255,.22),transparent 40%)',
          }}
        />
        <div
          style={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontFamily: SORA, fontWeight: 700, fontSize: 17, letterSpacing: '.1em', color: C.bg }}>
              PAFA
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', color: 'rgba(6,6,11,.7)' }}>
              VIRTUAL
            </span>
          </div>
          <div>
            <div
              style={{
                fontFamily: SORA,
                fontWeight: 600,
                fontSize: 18,
                letterSpacing: '.14em',
                color: C.bg,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              •••• •••• •••• 7362
            </div>
            <div
              style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(6,6,11,.78)' }}>
                {displayName.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'rgba(6,6,11,.78)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                09 / 30
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        <CardAction label="Pay by QR" onClick={() => actions.go('pay', { reset: true })} />
        <CardAction label="Details" />
        <CardAction label="Freeze" />
      </div>

      <div
        style={{
          marginTop: 22,
          background: C.surface,
          border: `1px solid ${C.hairline}`,
          borderRadius: 20,
          padding: 18,
        }}
      >
        <Line label="Cashback rate" value={vm.rateStr} valueColor={C.mint} />
        <Line label="Lifetime stock earned" value="$186.42" style={{ marginTop: 14 }} />
        <Line
          label="Wallet"
          value={wallet ? shortAddress(wallet.address, 4, 4) : 'Not connected'}
          style={{ marginTop: 14 }}
        />
        <Line label="Network" value={vm.chainLabel} style={{ marginTop: 14 }} valueColor={C.muted} />
        <div
          onClick={logout}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') logout();
          }}
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1px solid ${C.hairline}`,
            fontSize: 13,
            fontWeight: 600,
            color: C.red,
            cursor: 'pointer',
          }}
        >
          Sign out{mode === 'mock' ? ' (demo session)' : ''}
        </div>
      </div>

      <SectionTitle style={{ marginTop: 24 }}>Transactions</SectionTitle>
      <div
        style={{
          marginTop: 12,
          background: C.surface,
          border: `1px solid ${C.hairline}`,
          borderRadius: 18,
          overflow: 'hidden',
        }}
      >
        {vm.allTx.map((t) => (
          <TxRow key={t.id} tx={t} onClick={() => actions.openTx(t.id)} />
        ))}
      </div>
    </div>
  );
}

/** Full history with per-row vesting status. */
export function Activity({ vm, actions }: ScreenProps) {
  return (
    <div>
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.hairline}`,
          borderRadius: 20,
          padding: 18,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <Eyebrow>Spent in {vm.monthName}</Eyebrow>
          <div
            style={{
              marginTop: 6,
              fontFamily: SORA,
              fontWeight: 600,
              fontSize: 22,
              color: C.white,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {vm.spendStr}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Eyebrow>Stock earned</Eyebrow>
          <div
            style={{
              marginTop: 6,
              fontFamily: SORA,
              fontWeight: 600,
              fontSize: 22,
              color: C.mint,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            $186.42
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          background: C.surface,
          border: `1px solid ${C.hairline}`,
          borderRadius: 18,
          overflow: 'hidden',
        }}
      >
        {vm.allTx.map((t) => (
          <TxRow key={t.id} tx={t} onClick={() => actions.openTx(t.id)} showStatus />
        ))}
      </div>
    </div>
  );
}

function CardAction({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick();
      }}
      style={{
        background: C.surface,
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 16,
        padding: '14px 10px',
        textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text2 }}>{label}</div>
    </div>
  );
}

function Line({
  label,
  value,
  valueColor = C.white,
  style,
}: {
  label: string;
  value: string;
  valueColor?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, ...style }}>
      <span style={{ fontSize: 13, color: C.muted, flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontFamily: SORA,
          fontSize: 15,
          fontWeight: 600,
          color: valueColor,
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'right',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </div>
  );
}
