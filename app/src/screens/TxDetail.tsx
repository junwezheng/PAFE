import { C, SORA } from '../theme';
import { KeyValue, Mono } from '../components/Bits';
import { useAuth } from '../auth/context';
import { shortAddress } from '../lib/format';
import { explorerTx } from '../solana/config';
import type { ScreenProps } from './types';

/** One purchase, and the stock it produced. */
export function TxDetail({ vm, actions }: ScreenProps) {
  const { wallet } = useAuth();
  const tx = vm.tx;
  if (!tx) return null;

  return (
    <div style={{ animation: 'pafaRise .3s ease both' }}>
      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Mono size={52} radius={16} fontSize={17}>
            {tx.mono}
          </Mono>
        </div>
        <div style={{ marginTop: 14, fontFamily: SORA, fontWeight: 600, fontSize: 19, color: C.white }}>
          {tx.merchant}
        </div>
        <div style={{ marginTop: 4, fontSize: 12.5, color: C.gray }}>
          {tx.date} · {tx.place}
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: SORA,
            fontWeight: 600,
            fontSize: 36,
            color: C.white,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {tx.amountStr}
        </div>
      </div>

      <div
        style={{
          marginTop: 26,
          borderRadius: 20,
          padding: 2,
          background: 'linear-gradient(135deg,rgba(0,255,163,.45),rgba(153,69,255,.45))',
        }}
      >
        <div style={{ borderRadius: 18, background: C.surfaceDeep, padding: 18 }}>
          <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 14.5, color: C.white }}>Stock earned</div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <KeyValue label="Shares" value={tx.shares} />
            <KeyValue label="Value at fill" value={tx.fill} />
            <KeyValue label="Value now" value={tx.now} valueColor={C.mint} />
            <KeyValue label="Status" value={tx.status} valueColor={tx.statusColor} tabular={false} />
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          borderRadius: 20,
          background: C.surfaceDeep,
          border: `1px solid ${C.hairline}`,
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 14.5, color: C.white }}>Stock transfer</div>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 99,
              background: tx.transferPending
                ? 'rgba(255,184,77,.16)'
                : tx.onChain
                  ? 'rgba(20,241,149,.16)'
                  : 'rgba(153,69,255,.16)',
              color: tx.transferPending ? C.amber : tx.onChain ? C.mint : C.lilac,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '.05em',
              textTransform: 'uppercase',
            }}
          >
            {tx.transferPending ? 'Sending' : tx.onChain ? 'Confirmed' : 'Demo record'}
          </span>
        </div>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 11 }}>
          <TransferRow label="Stock sent" value={tx.shares} />
          <TransferRow label="From" value="PAFE rewards treasury" />
          <TransferRow label="To" value={wallet ? shortAddress(wallet.address, 6, 6) : 'Your PAFE wallet'} />
          <TransferRow label="Network" value={tx.onChain ? vm.chainLabel : 'Solana · simulated'} />
          <TransferRow
            label="Transaction"
            value={tx.transferPending ? 'Pending…' : tx.signature ? shortAddress(tx.signature, 6, 6) : 'Not settled'}
            href={tx.onChain && tx.signature ? explorerTx(tx.signature) : undefined}
          />
        </div>
      </div>

      <div
        onClick={() => actions.openBrand(tx.key)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') actions.openBrand(tx.key);
        }}
        style={{
          marginTop: 20,
          padding: 15,
          borderRadius: 16,
          border: '1px solid rgba(153,69,255,.4)',
          textAlign: 'center',
          fontFamily: SORA,
          fontWeight: 600,
          fontSize: 14.5,
          color: C.lilacSoft,
          cursor: 'pointer',
        }}
      >
        View {tx.brandName} holding
      </div>
    </div>
  );
}

function TransferRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <span style={{ fontSize: 12, color: C.muted2, flexShrink: 0 }}>{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12, fontWeight: 600, color: C.lilac, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </a>
      ) : (
        <span
          style={{ fontSize: 12, fontWeight: 600, color: C.text3, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </span>
      )}
    </div>
  );
}
