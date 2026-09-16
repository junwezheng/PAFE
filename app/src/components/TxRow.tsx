import { C, SORA } from '../theme';

export interface TxRowData {
  id: string;
  mono: string;
  merchant: string;
  date: string;
  status: string;
  amountStr: string;
  earnStr: string;
  earnColor: string;
}

/** The transaction row shared by Home, Card and Activity. */
export function TxRow({
  tx,
  onClick,
  showStatus = false,
}: {
  tx: TxRowData;
  onClick: () => void;
  showStatus?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      style={{
        padding: '14px 16px',
        borderBottom: `1px solid ${C.hairlineSoft}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: 'rgba(255,255,255,.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: SORA,
          fontWeight: 700,
          fontSize: 12,
          color: '#B8B8CC',
          flexShrink: 0,
        }}
      >
        {tx.mono}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: C.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {tx.merchant}
        </div>
        <div style={{ marginTop: 2, fontSize: 11.5, color: C.gray }}>
          {showStatus ? `${tx.date} · ${tx.status}` : tx.date}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
          {tx.amountStr}
        </div>
        <div
          style={{
            marginTop: 2,
            fontSize: 11.5,
            fontWeight: 600,
            color: tx.earnColor,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {tx.earnStr}
        </div>
      </div>
    </div>
  );
}
