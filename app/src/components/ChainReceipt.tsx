import { C, SORA } from '../theme';
import { shortAddress } from '../lib/format';
import { explorerAddress, explorerTx } from '../solana/config';
import type { PurchaseResult } from '../solana/service';

/**
 * What actually happened on Solana for this purchase: the swap route into the
 * xStock, the escrow lot it landed in, and the signature. When the write had to
 * degrade (no treasury signer, RPC down) it says so rather than implying
 * settlement that didn't happen.
 */
export function ChainReceipt({ receipt, settling }: { receipt: PurchaseResult | null; settling: boolean }) {
  if (settling && !receipt) {
    return (
      <Shell>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: '2px solid rgba(153,69,255,.25)',
              borderTopColor: C.mint,
              animation: 'pafaSpin .7s linear infinite',
            }}
          />
          <span style={{ fontSize: 12.5, color: C.muted }}>Settling on Solana…</span>
        </div>
      </Shell>
    );
  }

  if (!receipt) return null;

  const { route, signature, lotAddress, onChain, note } = receipt;

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: SORA, fontWeight: 600, fontSize: 13.5, color: C.white }}>Settlement</span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 99,
            background: onChain ? 'rgba(20,241,149,.16)' : 'rgba(255,184,77,.16)',
            color: onChain ? C.mint : C.amber,
          }}
        >
          {onChain ? 'On-chain' : 'Not settled'}
        </span>
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Row
          label="Route"
          value={`${route.inputUsd.toFixed(2)} USDC → ${route.outputShares.toFixed(4)} ${route.outputSymbol}`}
        />
        <Row label="Via" value={route.via} muted={!route.live} />
        {lotAddress ? (
          <Row
            label="Vesting lot"
            value={shortAddress(lotAddress, 6, 6)}
            href={onChain ? explorerAddress(lotAddress) : undefined}
          />
        ) : null}
        {signature ? (
          <Row
            label="Signature"
            value={shortAddress(signature, 6, 6)}
            href={onChain ? explorerTx(signature) : undefined}
          />
        ) : null}
      </div>

      {note ? (
        <div style={{ marginTop: 12, fontSize: 11.5, lineHeight: 1.45, color: C.gray }}>{note}</div>
      ) : null}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 18,
        background: C.surfaceDeep,
        border: '1px solid rgba(255,255,255,.06)',
        borderRadius: 20,
        padding: 18,
      }}
    >
      {children}
    </div>
  );
}

function Row({ label, value, href, muted }: { label: string; value: string; href?: string; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
      <span style={{ fontSize: 12, color: C.muted2, flexShrink: 0 }}>{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.lilac,
            fontVariantNumeric: 'tabular-nums',
            textAlign: 'right',
          }}
        >
          {value}
        </a>
      ) : (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: muted ? C.gray : C.text3,
            fontVariantNumeric: 'tabular-nums',
            textAlign: 'right',
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
}
