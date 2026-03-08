/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_API_PROXY_TARGET: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_QUERY_STALE_TIME_MS: string;
  readonly VITE_QUERY_RETRY_COUNT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
