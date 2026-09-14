/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_CONSUMER_APP_URL?: string;
  /** Sentry DSN. Absent = error reporting off. */
  readonly VITE_SENTRY_DSN?: string;
  /** Stamped by vite.config.ts: "business-portal@<short sha>". */
  readonly VITE_APP_RELEASE?: string;
  /** Stamped by vite.config.ts from VERCEL_ENV: production | preview | development. */
  readonly VITE_APP_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
