// Canonical icon override for the 8 seeded communities.
// The communities table stores an `icon` column written by the seed migration,
// but historical encoding issues mean some rows ship with garbled characters
// that render as boxes/question marks on the device. This map is the source of
// truth — call resolveCommunityIcon(name, dbIcon) and the override wins.
//
// Used by SocialScreen, SocialDrawer, CreatePostModal — keep this the single
// place that knows community → emoji.

export const COMMUNITY_ICON_MAP: Record<string, string> = {
  'Nightlife Lagos':    '\u{1F319}', // 🌙
  'Restaurant Reviews': '\u{1F37D}', // 🍽️
  'Events & Concerts':  '\u{1F3B5}', // 🎵
  'Island Vibes':       '\u{1F3DD}', // 🏝️
  'Mainland Connect':   '\u{1F3D9}', // 🏙️
  'Foodies United':     '\u{1F355}', // 🍕
  'Party People':       '\u{1F389}', // 🎉
  'Culture & Arts':     '\u{1F3A8}', // 🎨
};

export const resolveCommunityIcon = (name: string, dbIcon?: string | null): string =>
  COMMUNITY_ICON_MAP[name] ?? dbIcon ?? '\u{1F3AD}'; // 🎭 default for unknown communities
