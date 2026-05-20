/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_LOCAL_CATALOG_API?: string;
  readonly VITE_CATALOG_API_BASE?: string;
  readonly VITE_CATALOG_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
