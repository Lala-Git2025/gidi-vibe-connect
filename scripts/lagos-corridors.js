/**
 * The curated Lagos corridors, and the one Routes API call both traffic agents
 * make. Shared so the two cannot drift apart.
 *
 * Why shared and not copy-pasted: `route_key` is the UPSERT identity in
 * traffic_live_routes AND the foreign key by which traffic_route_baseline and
 * traffic_route_readings are joined. If the live agent and the baseline agent
 * held separate copies of this list, a reworded label would be harmless but a
 * changed key — or a route added to one list and not the other — would put
 * readings against a baseline that does not exist, and the app would silently
 * fall back to "no comparison" forever. One list removes the failure mode.
 *
 * Routes are place-name ADDRESSES, not coordinates, and Google's geocoding
 * resolves them. Hand-typed lat/lng is how a route ends up silently measuring
 * the wrong stretch of road; a badly-resolved address fails loudly instead.
 */

export const ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// route_key is the stable identity and must NEVER change once live;
// route_label is what the app shows and may be reworded freely.
//
// Each route measures ONE direction. That is a real limitation worth
// remembering when reading the numbers: Third Mainland here runs INTO the
// island, so it peaks in the morning (Google predicts 1.9x free-flow at 07:00)
// and is nearly clear at 18:00. The evening crush is the other way.
export const ROUTES = [
  {
    key: 'third-mainland-bridge',
    label: 'Third Mainland Bridge',
    origin: 'Iyana Oworo, Lagos, Nigeria',
    destination: 'Adeniji Adele Road, Lagos Island, Lagos, Nigeria',
  },
  {
    key: 'eko-bridge',
    label: 'Eko Bridge',
    origin: 'Costain, Lagos, Nigeria',
    destination: 'Idumota, Lagos Island, Lagos, Nigeria',
  },
  {
    key: 'lekki-epe-expressway',
    label: 'Lekki-Epe Expressway',
    origin: 'Falomo, Ikoyi, Lagos, Nigeria',
    destination: 'Ajah, Lagos, Nigeria',
  },
  {
    key: 'ikorodu-road',
    label: 'Ikorodu Road',
    origin: 'Ojota, Lagos, Nigeria',
    destination: 'Fadeyi, Lagos, Nigeria',
  },
  {
    key: 'apapa-oshodi-expressway',
    label: 'Apapa-Oshodi Expressway',
    origin: 'Apapa, Lagos, Nigeria',
    destination: 'Oshodi, Lagos, Nigeria',
  },
  {
    key: 'agege-motor-road',
    label: 'Agege Motor Road',
    origin: 'Oshodi, Lagos, Nigeria',
    destination: 'Iyana Ipaja, Lagos, Nigeria',
  },
  {
    key: 'funsho-williams-avenue',
    label: 'Funsho Williams Avenue',
    origin: 'Costain, Lagos, Nigeria',
    destination: 'Alaka, Surulere, Lagos, Nigeria',
  },
  {
    key: 'airport-road',
    label: 'Airport Road',
    origin: 'Mafoluku, Lagos, Nigeria',
    destination: 'Murtala Muhammed International Airport, Lagos, Nigeria',
  },
];

/**
 * Absolute congestion, from duration / free-flow. This is the "how bad is the
 * road" axis and it is NOT the same question as "is this unusual" — a corridor
 * can be genuinely heavy and completely normal for a Thursday at six. The app
 * shows both because the combination is what tells you whether waiting helps.
 *
 * Thresholds are a judgement call, chosen to match how a Lagos driver would
 * describe the road: a fifth slower than free-flow is noticeable but fine;
 * nearly double is a real problem.
 */
export const severityFor = (ratio) => {
  if (ratio < 1.15) return 'light';
  if (ratio < 1.4)  return 'moderate';
  if (ratio < 1.8)  return 'heavy';
  return 'critical';
};

/**
 * How this reading compares with what this corridor usually does at this hour.
 * Returns null when there is no baseline, so the app can omit the comparison
 * rather than invent one.
 *
 * The bands are deliberately wide around 1.0. Google's prediction is a model,
 * our reading is a sample, and Lagos traffic is noisy — calling a 10% wobble
 * "worse than usual" would cry wolf every other hour and the label would stop
 * meaning anything.
 */
export const vsUsualFor = (duration, expected) => {
  if (!expected) return null;
  const ratio = duration / expected;
  if (ratio < 0.85) return 'better';
  if (ratio < 1.15) return 'normal';
  if (ratio < 1.5)  return 'worse';
  return 'much_worse';
};

/** Lagos is UTC+1 year-round, no DST — so the hour bucket is a fixed offset. */
export const LAGOS_UTC_OFFSET_HOURS = 1;

export const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Which baseline bucket an instant falls in, in Lagos local time.
 *
 * Full day-of-week, not weekday/weekend. Google's own predictions for Third
 * Mainland at 07:00 run Mon 42 · Tue 31 · Wed 29 · Thu 24 · Fri 22 · Sat 15 ·
 * Sun 14 — Monday is nearly double Friday on the same road at the same hour.
 * A weekday bucket would have to pick a middle value and would then flag every
 * ordinary Monday as "much worse than usual", which is precisely the kind of
 * false alarm this baseline exists to eliminate.
 */
export const lagosParts = (date = new Date()) => {
  const shifted = new Date(date.getTime() + LAGOS_UTC_OFFSET_HOURS * 3600_000);
  return { hour: shifted.getUTCHours(), dow: shifted.getUTCDay() };
};

/** Routes API returns durations as strings like "1234s". */
export const seconds = (s) => (typeof s === 'string' ? parseInt(s, 10) : null);

/**
 * One Routes API call. `departureTime` omitted means "now"; set to a FUTURE
 * instant it returns Google's historical prediction for that slot, which is
 * how the baseline is built without waiting weeks to collect our own.
 */
export async function computeRoute(route, apiKey, departureTime = null) {
  const body = {
    origin:      { address: route.origin },
    destination: { address: route.destination },
    travelMode: 'DRIVE',
    // TRAFFIC_AWARE makes `duration` reflect traffic at departureTime;
    // `staticDuration` stays the no-traffic baseline regardless.
    routingPreference: 'TRAFFIC_AWARE',
    computeAlternativeRoutes: false,
  };
  if (departureTime) body.departureTime = departureTime.toISOString();

  const res = await fetch(ROUTES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      // Only these fields — the mask decides the pricing SKU, and duration
      // versus staticDuration is the entire signal. Segment-level traffic
      // along the polyline is a pricier tier and isn't needed for a ratio.
      'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Routes API ${res.status}: ${text.slice(0, 300)}`);
  }

  const { routes } = await res.json();
  const r = routes?.[0];
  if (!r) throw new Error('Routes API returned no route');

  const duration = seconds(r.duration);
  const freeFlow = seconds(r.staticDuration);
  if (!duration || !freeFlow) throw new Error(`Unparseable durations: ${JSON.stringify(r)}`);

  return { duration, freeFlow, distance: r.distanceMeters ?? null };
}
