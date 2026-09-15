/**
 * Design tokens — the single source of truth for type, space, radius, colour
 * and elevation.
 *
 * Why this exists: before it, the app carried 22 distinct font sizes (nine of
 * them between 9 and 17px), 30 distinct corner radii and 46 hardcoded hex
 * values, which is why nothing quite lined up from one screen to the next.
 * Every new style should compose from here rather than inventing a number.
 *
 * Direction: "after dark" — a warm near-black ground, gold spent sparingly so
 * it still means something, and energy carried by photography rather than by
 * flat colour. Premium comes from restraint and typography; street comes from
 * contrast, motion and the imagery.
 */

// ── Type ────────────────────────────────────────────────────────────────────
// Eight steps. Anything that doesn't fit one of these is a design decision
// worth questioning, not a new number.
export const type = {
  /** 11 — uppercase labels, meta, timestamps */
  xs: 11,
  /** 13 — secondary body, captions, supporting rows */
  sm: 13,
  /** 15 — default body */
  base: 15,
  /** 17 — card titles, emphasised body */
  md: 17,
  /** 20 — section headings */
  lg: 20,
  /** 25 — screen titles */
  xl: 25,
  /** 31 — hero statements */
  xxl: 31,
  /** 40 — display, used once per screen at most */
  display: 40,
} as const;

export const weight = {
  regular: '400',
  medium: '500',
  bold: '700',
  black: '900',
} as const;

// Line heights as multipliers, applied against the size above.
export const leading = {
  tight: 1.15,   // display and headings
  snug: 1.3,     // card titles
  normal: 1.5,   // body
} as const;

export const tracking = {
  /** Uppercase labels need air to stay legible at 11px. */
  label: 1.6,
  tight: -0.4,   // large display type closes up
  none: 0,
} as const;

// ── Space ───────────────────────────────────────────────────────────────────
// 4px base. Screen gutter is `lg`; the gap between major sections is `xxl`.
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 56,
} as const;

/** Every screen uses the same horizontal gutter. Non-negotiable. */
export const gutter = space.lg;

// ── Radius ──────────────────────────────────────────────────────────────────
export const radius = {
  sm: 8,    // chips, small controls
  md: 12,   // inputs, list rows
  lg: 18,   // cards
  xl: 24,   // hero cards, sheets
  full: 999,
} as const;

// ── Elevation ───────────────────────────────────────────────────────────────
// Three levels only. On a dark ground shadows read weakly, so depth comes
// mostly from surface lightness; the shadow is a supporting cue.
export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  /** Raised surfaces: cards sitting on the page. */
  low: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  /** Floating: the tab bar, sheets, anything above the scroll. */
  high: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
} as const;

// ── Colour ──────────────────────────────────────────────────────────────────
// Neutrals are warm — biased a few degrees toward the gold rather than taken
// from a stock grey ramp, so the ground and the accent read as one family.

const gold = {
  /** Hairlines, small highlights. */
  hi: '#FDE047',
  /** The brand accent. Use for one thing per view, not for everything. */
  base: '#EAB308',
  /** Pressed states, gradient ends. */
  deep: '#A16207',
  /** Gold that actually passes contrast as text on a light ground. */
  onLight: '#7A5200',
} as const;

export const darkPalette = {
  /** Page ground — warm near-black, never pure #000. */
  background: '#0B0A08',
  /** Cards and rows sitting on the page. */
  surface: '#16130F',
  /** Inputs, chips, anything nested inside a surface. */
  surfaceRaised: '#211D17',
  /** Hairlines and dividers. */
  line: '#2C2720',
  /** Stronger border, used on focused or selected elements. */
  lineStrong: '#453D31',

  text: '#F8F4EC',
  textMuted: '#A9A092',
  textFaint: '#6F6759',
  /** Text sitting on top of a gold fill. */
  onAccent: '#1A1509',

  primary: gold.base,
  goldHi: gold.hi,
  goldMid: gold.base,
  goldDeep: gold.deep,
  goldDark: gold.deep,
  primaryDark: gold.deep,

  // Semantic — deliberately separate from the brand accent, so "good" and
  // "on brand" never get confused with one another.
  live: '#4ADE80',
  success: '#4ADE80',
  hot: '#FB7185',
  error: '#FB7185',
  warning: '#FBBF24',
  info: '#7DD3FC',

  // Backwards compatibility with the pre-token styles still in the codebase.
  cardBackground: '#16130F',
  border: '#2C2720',
  textSecondary: '#A9A092',
} as const;

export const lightPalette: Palette = {
  /** Warm paper rather than pure white. */
  background: '#FBF8F1',
  surface: '#FFFFFF',
  surfaceRaised: '#F2ECE0',
  line: '#E2D9C8',
  lineStrong: '#C8BCA4',

  text: '#16130D',
  textMuted: '#5E564A',
  textFaint: '#8C8271',
  onAccent: '#1A1509',

  /** Deepened so gold text clears contrast on a light ground. The raw brand
   *  gold sits near 1.9:1 on white, which fails outright. */
  primary: gold.onLight,
  goldHi: gold.base,
  goldMid: gold.onLight,
  goldDeep: gold.onLight,
  goldDark: gold.deep,
  primaryDark: gold.deep,

  live: '#15803D',
  success: '#15803D',
  hot: '#BE123C',
  error: '#BE123C',
  warning: '#A16207',
  info: '#0369A1',

  cardBackground: '#FFFFFF',
  border: '#E2D9C8',
  textSecondary: '#5E564A',
} as const;

/** Both themes share this shape; values are plain strings, not literals. */
export type Palette = { [K in keyof typeof darkPalette]: string };

/**
 * Two-up tile geometry. The Home category grid and the trending venue rail
 * both read from this, so the two rows are guaranteed to be the same module
 * at the same size rather than drifting apart.
 */
export const tile = {
  height: 100,
  widthFor: (screenWidth: number) => (screenWidth - gutter * 2 - space.md) / 2,
} as const;

/**
 * Category gradients — the original vibrant set. Each tile owns a hue; the
 * pair is a mid tone into a deep tone of the same family so the grid reads as
 * saturated without going flat.
 */
export const categoryAccent: Record<string, readonly [string, string]> = {
  bars:        ['#7C3AED', '#4338CA'],
  restaurants: ['#EA580C', '#7C2D12'],
  nightlife:   ['#DB2777', '#831843'],
  daylife:     ['#F59E0B', '#92400E'],
  events:      ['#4338CA', '#1E1B4B'],
  social:      ['#10B981', '#064E3B'],
  news:        ['#0891B2', '#0E7490'],
  more:        ['#DC2626', '#7F1D1D'],
};
