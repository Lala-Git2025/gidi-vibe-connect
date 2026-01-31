import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category = 'all', limit = 20 } = await req.json().catch(() => ({}));

    console.log('Fetching Lagos events...');

    // Fetch events from multiple sources
    const events = await fetchLagosEvents(category, limit);

    // Store events in database for caching
    if (events.length > 0) {
      const { error: insertError } = await supabase
        .from('events')
        .upsert(events, { 
          onConflict: 'title,start_date',
          ignoreDuplicates: true 
        });

      if (insertError) {
        console.error('Error caching events:', insertError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      data: events,
      source: 'live_scraping',
      timestamp: new Date().toISOString(),
      total: events.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-lagos-events:', error);
    
    // Fallback to cached events
    const { data: cachedEvents } = await supabase
      .from('events')
      .select('*')
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(20);

    return new Response(JSON.stringify({ 
      success: true,
      data: cachedEvents || [],
      source: 'cached',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchLagosEvents(category: string, limit: number) {
  try {
    // Build query for active upcoming events
    let query = supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'upcoming')
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(limit);

    // Filter by category if specified
    if (category !== 'all' && category !== '') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events from database:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception in fetchLagosEvents:', error);
    return [];
  }
}