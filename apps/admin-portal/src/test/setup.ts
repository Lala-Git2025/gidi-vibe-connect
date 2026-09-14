import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount between tests so a leaked component's timers or subscriptions can't
// bleed into the next one — the auth contexts under test both hold timers.
afterEach(() => {
  cleanup();
});
