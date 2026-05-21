/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional override for the CoinSpot proxy base URL (production). */
  readonly VITE_COINSPOT_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
