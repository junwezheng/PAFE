import { C, SORA } from '../theme';
import { KeyValue, Mono } from '../components/Bits';
import type { ScreenProps } from './types';

/** One purchase, and the stock it produced. */
export function TxDetail({ vm, actions }: ScreenProps) {
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
