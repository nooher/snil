/// <reference types="vite/client" />

// Typed env vars consumed by the SNIL spine. Optional; absence disables telemetry.
interface ImportMetaEnv {
  readonly VITE_SNIL_TELEMETRY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
