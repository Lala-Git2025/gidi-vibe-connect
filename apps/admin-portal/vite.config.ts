import { execSync } from 'node:child_process';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

const APP = 'admin-portal';

// Vercel exposes the commit as VERCEL_GIT_COMMIT_SHA; fall back to git for
// local builds. Release names are "<app>@<short sha>" so a Sentry event maps
// straight back to a deploy.
function commitSha(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

// Source maps are generated and uploaded only when all three credentials are
// present on the build (Vercel project env). Otherwise the build is untouched:
// no maps emitted, nothing shipped.
const sentryUpload = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

export default defineConfig(({ mode }) => {
  const release = `${APP}@${commitSha().slice(0, 7)}`;
  const environment = process.env.VERCEL_ENV ?? mode;

  return {
    plugins: [
      react(),
      sentryUpload &&
        sentryVitePlugin({
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
          release: { name: release },
          sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
          telemetry: false,
        }),
    ],
    // Read as import.meta.env.* in src/lib/sentry.ts (typed in src/vite-env.d.ts).
    define: {
      'import.meta.env.VITE_APP_RELEASE': JSON.stringify(release),
      'import.meta.env.VITE_APP_ENV': JSON.stringify(environment),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      // 'hidden' emits maps for upload without a sourceMappingURL comment,
      // so browsers never request them.
      sourcemap: sentryUpload ? 'hidden' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
          },
        },
      },
    },
    server: {
      port: 3002,
      host: true,
    },
  };
});
