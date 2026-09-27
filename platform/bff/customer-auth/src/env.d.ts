/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BFF_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
