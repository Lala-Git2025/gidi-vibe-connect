#!/usr/bin/env node

/**
 * Eventbrite Events Sync
 * Fetches events from Eventbrite API and syncs to database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EVENTBRITE_TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log('🎫 EVENTBRITE EVENTS SYNC');
console.log('========================\n');

async function fetchEventbriteEvents() {
  if (!EVENTBRITE_TOKEN) {
    console.log('⚠️  EVENTBRITE_PRIVATE_TOKEN not found in .env');
    console.log('📖 To get an API token:');
    console.log('   1. Go to: https://www.eventbrite.com/platform/api');
    console.log('   2. Sign in and create a Private Token');
    console.log('   3. Add to .env: EVENTBRITE_PRIVATE_TOKEN=your_token_here\n');
    return [];
  }

  console.log('🔍 Searching for events in Lagos...\n');

  try {
    // Search for events in Lagos
    const response = await fetch(
      'https://www.eventbriteapi.com/v3/events/search/?location.address=Lagos,Nigeria&expand=venue,organizer&sort_by=date',
      {
        headers: {
          'Authorization': `Bearer ${EVENTBRITE_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Eventbrite API error:', error);
      return [];
    }

    const data = await response.json();
    console.log(`✅ Found ${data.events?.length || 0} events from Eventbrite\n`);

    return data.events || [];
  } catch (error) {
    console.error('❌ Error fetching from Eventbrite:', error.message);
    return [];
  }
}

function mapEventbriteToDb(event) {
  const venue = event.venue || {};
  const organizer = event.organizer || {};

  return {
    // Basic info
    title: event.name?.text || 'Untitled Event',
    description: event.description?.html || event.description?.text,
    short_description: event.summary || event.description?.text?.substring(0, 200),

    // Categorization
    category: event.category?.name || 'General',
    event_type: event.subcategory?.name || event.format?.name || 'Event',
    tags: [event.category?.name, event.subcategory?.name, event.format?.name].filter(Boolean),

    // Timing
    start_date: event.start?.utc || event.start?.local,
    end_date: event.end?.utc || event.end?.local,
    timezone: event.start?.timezone || 'Africa/Lagos',

    // Location
    venue_name: venue.name,
    venue_address: venue.address?.localized_address_display,
    location: venue.address?.city || 'Lagos, Nigeria',
    latitude: venue.latitude ? parseFloat(venue.latitude) : null,
    longitude: venue.longitude ? parseFloat(venue.longitude) : null,

    // Ticketing
    is_free: event.is_free || false,
    ticket_price_min: null, // Eventbrite doesn't provide this in search API
    ticket_price_max: null,
    currency: event.currency || 'NGN',
    ticket_url: event.url,
    tickets_available: event.capacity ? event.capacity - (event.capacity_is_custom ? 0 : 0) : null,

    // Media
    image_url: event.logo?.url || event.logo?.original?.url,
    banner_url: event.logo?.original?.url,
    gallery_urls: event.logo ? [event.logo.url] : [],

    // Organizer
    organizer_name: organizer.name,
    organizer_description: organizer.description?.text,
    organizer_url: organizer.url,

    // Social
    website_url: event.url,
    facebook_url: organizer.facebook,
    instagram_url: organizer.instagram,
    twitter_url: organizer.twitter,

    // Source tracking
    source: 'eventbrite',
    external_id: event.id,
    external_url: event.url,

    // Status
    status: event.status === 'live' ? 'upcoming' : event.status,
    is_verified: true, // Eventbrite events are verified
    is_active: event.status === 'live',

    // Metadata
    last_synced_at: new Date().toISOString(),
  };
}

async function syncEvents(events) {
  console.log('💾 Syncing events to database...\n');

  let newCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const event of events) {
    const dbEvent = mapEventbriteToDb(event);

    // Check if event exists
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('source', 'eventbrite')
      .eq('external_id', event.id)
      .single();

    if (existing) {
      // Update existing event
      const { error } = await supabase
        .from('events')
        .update(dbEvent)
        .eq('id', existing.id);

      if (error) {
        console.error(`   ❌ Failed to update: ${dbEvent.title} - ${error.message}`);
        skippedCount++;
      } else {
        console.log(`   ✅ Updated: ${dbEvent.title}`);
        updatedCount++;
      }
    } else {
      // Insert new event
      const { error } = await supabase
        .from('events')
        .insert(dbEvent);

      if (error) {
        console.error(`   ❌ Failed to insert: ${dbEvent.title} - ${error.message}`);
        skippedCount++;
      } else {
        console.log(`   ✅ New: ${dbEvent.title}`);
        newCount++;
      }
    }
  }

  console.log(`\n📊 SYNC RESULTS:`);
  console.log(`   ✅ New events: ${newCount}`);
  console.log(`   🔄 Updated events: ${updatedCount}`);
  console.log(`   ⚠️  Skipped: ${skippedCount}`);
  console.log('');
}

async function displayUpcomingEvents() {
  console.log('📅 UPCOMING EVENTS:\n');

  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, start_date, venue_name, source')
    .gte('start_date', new Date().toISOString())
    .order('start_date', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Error fetching events:', error.message);
    return;
  }

  if (!events || events.length === 0) {
    console.log('   No upcoming events found.\n');
    return;
  }

  events.forEach((event, i) => {
    const date = new Date(event.start_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    console.log(`   ${i + 1}. ${event.title}`);
    console.log(`      📍 ${event.venue_name || 'TBA'}`);
    console.log(`      📅 ${date}`);
    console.log(`      🔗 Source: ${event.source}\n`);
  });
}

async function main() {
  try {
    // Fetch events from Eventbrite
    const events = await fetchEventbriteEvents();

    if (events.length === 0) {
      console.log('No events to sync.\n');
      return;
    }

    // Sync to database
    await syncEvents(events);

    // Display summary
    await displayUpcomingEvents();

    console.log('✅ SYNC COMPLETE!\n');
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

main();
