import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache TTL: 5 minutes (matches the old client-side refresh interval)
const CACHE_TTL_MS = 5 * 60 * 1000;

interface RoutePoint {
  name: string;
  area: 'Mainland' | 'Island' | 'Lekki';
  lat: number;
  lon: number;
}

interface TrafficData {
  id: string;
  location: string;
  severity: 'light' | 'moderate' | 'heavy' | 'critical';
  description: string;
  area: string;
}

const MAJOR_ROUTES: RoutePoint[] = [
  // ── Mainland ──────────────────────────────────────────────
  { name: 'Third Mainland Bridge',   area: 'Mainland', lat: 6.4950, lon: 3.3800 },
  { name: 'Lagos-Ibadan Expressway', area: 'Mainland', lat: 6.6342, lon: 3.3517 },
  { name: 'Ikorodu Road',            area: 'Mainland', lat: 6.5833, lon: 3.3833 },
  { name: 'Apapa-Oshodi Expressway', area: 'Mainland', lat: 6.4747, lon: 3.3406 },
  { name: 'Western Avenue',          area: 'Mainland', lat: 6.4972, lon: 3.3597 },
  { name: 'Badagry Expressway',      area: 'Mainland', lat: 6.4833, lon: 3.2833 },
  // ── Island / Lekki ────────────────────────────────────────
  { name: 'Eko Bridge',              area: 'Island',   lat: 6.4553, lon: 3.3725 },
  { name: 'Carter Bridge',           area: 'Island',   lat: 6.4544, lon: 3.3769 },
  { name: 'Ozumba Mbadiwe Avenue',   area: 'Island',   lat: 6.4265, lon: 3.4247 },
  { name: 'Ahmadu Bello Way',        area: 'Island',   lat: 6.4267, lon: 3.4217 },
  { name: 'Lekki-Epe Expressway',    area: 'Lekki',    lat: 6.4427, lon: 3.4783 },
  { name: 'Admiralty Way',           area: 'Lekki',    lat: 6.4394, lon: 3.4792 },
];

const speedRatioToSeverity = (ratio: number): TrafficData['severity'] => {
  if (ratio >= 0.80) return 'light';
  if (ratio >= 0.60) return 'moderate';
  if (ratio >= 0.40) return 'heavy';
  return 'critical';
};

const severityToLabel = (severity: TrafficData['severity']): string => {
  switch (severity) {
    case 'light':    return 'Traffic flowing well';
    case 'moderate': return 'Moderate slowdown';
    case 'heavy':    return 'Heavy congestion';
    case 'critical': return 'Severe gridlock';
  }
};

const fetchRouteFlow = async (
  route: RoutePoint,
  apiKey: string,
): Promise<TrafficData | null> => {
  try {
    const url =
      `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json` +
      `?key=${apiKey}&point=${route.lat},${route.lon}&unit=KMPH`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const flow = data.flowSegmentData;
    if (!flow) return null;

    if (flow.roadClosure) {
      return {
        id: route.name,
        location: route.name,
        area: route.area,
        severity: 'critical',
        description: 'Road closed',
      };
    }

    const currentSpeed: number  = flow.currentSpeed  ?? 0;
    const freeFlowSpeed: number = flow.freeFlowSpeed ?? 1;
    const ratio    = currentSpeed / freeFlowSpeed;
    const severity = speedRatioToSeverity(ratio);

    return {
      id: route.name,
      location: route.name,
      area: route.area,
      severity,
      description: `${severityToLabel(severity)} · ${currentSpeed} km/h (free flow ${freeFlowSpeed} km/h)`,
    };
  } catch {
    return null;
  }
};

const fetchAllRoutes = async (apiKey: string): Promise<TrafficData[]> => {
  const results = await Promise.all(MAJOR_ROUTES.map((r) => fetchRouteFlow(r, apiKey)));

  const mainland = results.filter((r): r is TrafficData => r !== null && r.area === 'Mainland');
  const island   = results.filter((r): r is TrafficData => r !== null && r.area !== 'Mainland');

  // Interleave Island → Mainland → Island → Mainland …
  const mixed: TrafficData[] = [];
  const maxLen = Math.max(mainland.length, island.length);
  for (let i = 0; i < maxLen; i++) {
    if (island[i])   mixed.push(island[i]);
    if (mainland[i]) mixed.push(mainland[i]);
  }
  return mixed;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl     = Deno.env.get('SUPABASE_URL')         ?? '';
    const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const tomtomApiKey    = Deno.env.get('TOMTOM_API_KEY')       ?? '';

    if (!tomtomApiKey) {
      return new Response(
        JSON.stringify({ error: 'TOMTOM_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Use service-role key so we can write to traffic_cache (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── 1. Check cache ────────────────────────────────────────
    const { data: cacheRow } = await supabase
      .from('traffic_cache')
      .select('data, updated_at')
      .eq('id', 1)
      .single();

    if (cacheRow) {
      const age = Date.now() - new Date(cacheRow.updated_at).getTime();
      if (age < CACHE_TTL_MS && Array.isArray(cacheRow.data) && cacheRow.data.length > 0) {
        console.log(`Serving traffic from cache (age: ${Math.round(age / 1000)}s)`);
        return new Response(
          JSON.stringify({ data: cacheRow.data, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // ── 2. Cache miss → fetch from TomTom ────────────────────
    console.log('Cache miss — fetching fresh traffic data from TomTom');
    const fresh = await fetchAllRoutes(tomtomApiKey);

    if (fresh.length === 0) {
      // Return stale cache rather than an empty result
      return new Response(
        JSON.stringify({ data: cacheRow?.data ?? [], cached: true, stale: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 3. Update cache ───────────────────────────────────────
    await supabase
      .from('traffic_cache')
      .upsert({ id: 1, data: fresh, updated_at: new Date().toISOString() });

    return new Response(
      JSON.stringify({ data: fresh, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('get-traffic error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
