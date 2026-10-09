/**
 * What's new, for the header panel.
 *
 * Deliberately a file and not a table. Release notes are written by whoever
 * ships the release, in the same commit as the change — a database row would
 * have to be remembered separately and would drift from what actually shipped.
 *
 * The header's pip used to pulse permanently over a button with no handler,
 * announcing news that did not exist. It now lights only when the newest entry
 * below is one this browser has not acknowledged, tracked in localStorage: a
 * per-viewer convenience, not state worth a round trip.
 *
 * Add new entries to the TOP. `id` must be unique and must never be reused.
 */

export interface ChangelogEntry {
  id: string;
  date: string;
  title: string;
  body: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-10-07-offers-notifications',
    date: '2026-10-07',
    title: 'Offers, notifications and a real Audience page',
    body: 'Create deals for your venues and they appear in the Gidi Connect app. The bell now carries real alerts — new reviews, RSVPs and check-ins. Audience shows who is actually engaging with your venues.',
  },
  {
    id: '2026-10-07-dashboard-real-numbers',
    date: '2026-10-07',
    title: 'Dashboard figures are live',
    body: 'Check-ins, profile views and venue counts are read from your own data, with week-on-week comparisons. Every panel can be exported to CSV.',
  },
  {
    id: '2026-10-05-events-ingestion',
    date: '2026-10-05',
    title: 'Lagos events are flowing in',
    body: 'The app now lists real events across Lagos from public listings, alongside the ones you publish here.',
  },
];

const SEEN_KEY = 'gidi.business.changelog.seen';

/**
 * Every read and write is wrapped: localStorage throws in a private window and
 * on blocked site data, and a changelog pip is never worth taking the header
 * down over.
 */
export const lastSeenEntryId = (): string | null => {
  try {
    return window.localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
};

export const markChangelogSeen = (): void => {
  try {
    if (CHANGELOG[0]) window.localStorage.setItem(SEEN_KEY, CHANGELOG[0].id);
  } catch {
    /* no-op: the panel still works, the pip just returns next load */
  }
};

export const hasUnseenChangelog = (): boolean =>
  CHANGELOG.length > 0 && lastSeenEntryId() !== CHANGELOG[0].id;
