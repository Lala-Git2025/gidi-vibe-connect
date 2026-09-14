/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  /** Sentry DSN. Absent = error reporting off. */
  readonly VITE_SENTRY_DSN?: string;
  /** Stamped by vite.config.ts: "admin-portal@<short sha>". */
  readonly VITE_APP_RELEASE?: string;
  /** Stamped by vite.config.ts from VERCEL_ENV: production | preview | development. */
  readonly VITE_APP_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
