/**
 * Lagos areas — the single source of truth.
 *
 * Why this exists: the app carried two different hardcoded area lists that
 * disagreed with each other. `VibeCheck` had ten areas with alias matching and
 * real venue counts; `ExploreAreaScreen` had six areas with bare emoji and
 * stock photography and no data. Each had what the other lacked. Neither
 * included Oniru, which holds three venues that were therefore unreachable by
 * area browsing at all.
 */

import type { Ionicons } from '@expo/vector-icons';

export interface LagosArea {
  id: string;
  name: string;
  shortName: string;
  blurb: string;
  icon: keyof typeof Ionicons.glyphMap;
  /**
   * Substrings tested against `venues.location`, lowercased. Order here does
   * not matter — `matchArea` tests the longest alias across ALL areas first,
   * so a more specific area always wins over a less specific one.
   */
  aliases: string[];
}

export const LAGOS_AREAS: LagosArea[] = [
  {
    id: 'victoria-island',
    name: 'Victoria Island',
    shortName: 'VI',
    blurb: 'Upscale dining and nightlife',
    icon: 'business',
    aliases: ['Victoria Island', 'V/I'],
  },
  {
    id: 'lekki',
    name: 'Lekki',
    shortName: 'Lekki',
    blurb: 'Trendy bars and beach clubs',
    icon: 'sunny',
    aliases: ['Lekki', 'Lekki Phase 1', 'Lekki Phase 2'],
  },
  {
    id: 'ikoyi',
    name: 'Ikoyi',
    shortName: 'Ikoyi',
    blurb: 'Fine dining and luxury lounges',
    icon: 'wine',
    aliases: ['Ikoyi'],
  },
  {
    id: 'oniru',
    name: 'Oniru',
    shortName: 'Oniru',
    blurb: 'Beachfront bars and weekend crowds',
    icon: 'umbrella',
    aliases: ['Oniru'],
  },
  {
    id: 'ikeja',
    name: 'Ikeja',
    shortName: 'Ikeja',
    blurb: 'Airport-side entertainment',
    icon: 'airplane',
    aliases: ['Ikeja', 'Ikeja GRA'],
  },
  {
    id: 'yaba',
    name: 'Yaba',
    shortName: 'Yaba',
    blurb: 'Youth culture and live music',
    icon: 'musical-notes',
    aliases: ['Yaba'],
  },
  {
    id: 'surulere',
    name: 'Surulere',
    shortName: 'Surulere',
    blurb: 'Local spots and live bands',
    icon: 'mic',
    aliases: ['Surulere'],
  },
  {
    id: 'ajah',
    name: 'Ajah',
    shortName: 'Ajah',
    blurb: 'Easygoing neighbourhood haunts',
    icon: 'home',
    aliases: ['Ajah', 'Sangotedo'],
  },
  {
    id: 'festac',
    name: 'Festac',
    shortName: 'Festac',
    blurb: 'Mainland lounges and eateries',
    icon: 'grid',
    aliases: ['Festac', 'Festac Town'],
  },
  {
    id: 'lagos-island',
    name: 'Lagos Island',
    shortName: 'Lagos Is.',
    blurb: 'Old Lagos, Marina and Broad Street',
    icon: 'boat',
    // No bare 'Island' alias. The old matcher was a substring test, so
    // 'Island' swallowed every Victoria Island venue and reported both areas
    // with the same count.
    aliases: ['Lagos Island', 'Isale Eko', 'Marina', 'Broad Street'],
  },
  {
    id: 'maryland',
    name: 'Maryland',
    shortName: 'Maryland',
    blurb: 'Mall-side bars and casual dining',
    icon: 'storefront',
    aliases: ['Maryland'],
  },
];

/**
 * Every (alias, area) pair, longest alias first. Precomputed once so matching
 * is a single ordered scan.
 */
const ALIAS_INDEX: { alias: string; area: LagosArea }[] = LAGOS_AREAS
  .flatMap(area => area.aliases.map(alias => ({ alias: alias.toLowerCase(), area })))
  .sort((a, b) => b.alias.length - a.alias.length);

/**
 * Resolve a free-text `venues.location` to exactly one area, or null.
 *
 * One venue belongs to one area. The previous implementation incremented a
 * counter for every area whose alias matched, so a single venue could be
 * counted two or three times over — which is how Victoria Island and Lagos
 * Island both came to report 14. Returning a single winner makes that class of
 * bug structurally impossible rather than something alias curation has to keep
 * catching.
 */
export const matchArea = (location: string | null | undefined): LagosArea | null => {
  if (!location) return null;
  const haystack = location.toLowerCase();
  return ALIAS_INDEX.find(entry => haystack.includes(entry.alias))?.area ?? null;
};

/** Count venues per area id. Areas with no venues are absent from the map. */
export const countByArea = (
  locations: (string | null | undefined)[],
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const location of locations) {
    const area = matchArea(location);
    if (area) counts[area.id] = (counts[area.id] || 0) + 1;
  }
  return counts;
};

// ── Vibe ladder ─────────────────────────────────────────────────────────────

export type VibeLevel = 'Electric' | 'Buzzing' | 'Vibing' | 'Chill';

export interface Vibe {
  level: VibeLevel;
  /** Key into the theme palette, so the ladder follows the active theme. */
  tone: 'primary' | 'hot' | 'info' | 'textMuted';
  icon: keyof typeof Ionicons.glyphMap;
  threshold: string;
  description: string;
}

/**
 * One hue family per step — gold, rose, blue, grey — descending from hot to
 * quiet. The steps were previously primary/warning/error/info, but on the
 * light theme `warning` and `primary` are both #A16207, so Electric and
 * Buzzing rendered in exactly the same colour. Separating by family rather
 * than by neighbouring shades keeps the steps legible in both themes without
 * relying on two golds being told apart.
 */
const LADDER: (Vibe & { min: number })[] = [
  {
    min: 15, level: 'Electric', tone: 'primary', icon: 'flash',
    threshold: '15+ venues',
    description: 'The densest area on the app — the most places to choose between.',
  },
  {
    min: 8, level: 'Buzzing', tone: 'hot', icon: 'flame',
    threshold: '8–14 venues',
    description: 'Plenty of listed spots. A solid area to build a night around.',
  },
  {
    min: 3, level: 'Vibing', tone: 'info', icon: 'sparkles',
    threshold: '3–7 venues',
    description: 'A handful of places listed — enough for a short list.',
  },
  {
    min: 0, level: 'Chill', tone: 'textMuted', icon: 'musical-notes',
    threshold: '1–2 venues',
    description: 'Only a couple listed here so far.',
  },
];

/**
 * The ladder ranks areas by how many venues are LISTED, not by how busy they
 * are tonight. It reads no check-ins and does not change through the evening,
 * which is why nothing here is labelled live. Wiring it to `venue_check_ins`
 * is the obvious upgrade, but that table holds 5 rows in total and none in the
 * last 24 hours — every area would read Chill and the screen would say less
 * than it does now.
 */
export const vibeFor = (venueCount: number): Vibe =>
  LADDER.find(step => venueCount >= step.min) ?? LADDER[LADDER.length - 1];

/** The full ladder, for the explainer sheet. */
export const VIBE_LADDER: Vibe[] = LADDER;
