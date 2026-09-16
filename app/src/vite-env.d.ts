/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOLANA_RPC?: string;
  readonly VITE_SOLANA_CLUSTER?: 'devnet' | 'mainnet-beta' | 'testnet';
  readonly VITE_PAFA_PROGRAM_ID?: string;
  readonly VITE_PAFA_TREASURY?: string;
  readonly VITE_PAFA_API?: string;
  readonly VITE_PRIVY_APP_ID?: string;
  readonly VITE_XSTOCK_MINTS?: string;
  readonly VITE_FORCE_SIMULATED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
