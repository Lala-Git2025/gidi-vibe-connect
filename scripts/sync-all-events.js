#!/usr/bin/env node

/**
 * Master Events Sync System
 * Orchestrates syncing from all event sources
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log('🎭 MASTER EVENTS SYNC SYSTEM');
console.log('============================\n');

async function checkMigration() {
  console.log('🔍 Checking events table...\n');

  try {
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .limit(1);

    if (error && error.message.includes('relation "events" does not exist')) {
      console.error('❌ Events table does not exist!\n');
      console.log('📖 PLEASE RUN THE MIGRATION FIRST:');
      console.log('==================================');
      console.log('1. Go to: https://supabase.com/dashboard/project/xvtjcpwkrsoyrhhptdmc/sql');
      console.log('2. Click "New Query"');
      console.log('3. Copy from: supabase/migrations/20260116000000_create_events_table.sql');
      console.log('4. Paste and click "Run"\n');
      process.exit(1);
    }

    console.log('✅ Events table verified\n');
    return true;
  } catch (error) {
    console.error('❌ Error checking migration:', error.message);
    process.exit(1);
  }
}

function runScript(scriptPath, name) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🔄 Running: ${name}`);
  console.log('='.repeat(50));

  try {
    execSync(`node ${scriptPath}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    return true;
  } catch (error) {
    console.error(`\n❌ ${name} failed:`, error.message);
    return false;
  }
}

async function displayFinalSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL EVENTS SUMMARY');
  console.log('='.repeat(50) + '\n');

  try {
    // Get total count
    const { count: totalCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    console.log(`Total Active Events: ${totalCount || 0}\n`);

    // Get by source
    const { data: bySource } = await supabase
      .from('events')
      .select('source')
      .eq('is_active', true);

    if (bySource) {
      const sourceCounts = {};
      bySource.forEach(event => {
        sourceCounts[event.source] = (sourceCounts[event.source] || 0) + 1;
      });

      console.log('Events by Source:');
      Object.entries(sourceCounts).forEach(([source, count]) => {
        const icon = {
          eventbrite: '🎫',
          nairabox: '🇳🇬',
          scraped: '🌐',
          manual: '✍️'
        }[source] || '📅';
        console.log(`   ${icon} ${source}: ${count} events`);
      });
      console.log('');
    }

    // Get upcoming vs past
    const now = new Date().toISOString();

    const { count: upcomingCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('start_date', now);

    const { count: pastCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .lt('start_date', now);

    console.log('Events by Time:');
    console.log(`   📅 Upcoming: ${upcomingCount || 0} events`);
    console.log(`   ⏰ Past: ${pastCount || 0} events\n`);

    // Get next 5 upcoming events
    const { data: upcoming } = await supabase
      .from('events')
      .select('title, start_date, venue_name, source')
      .eq('is_active', true)
      .gte('start_date', now)
      .order('start_date', { ascending: true })
      .limit(5);

    if (upcoming && upcoming.length > 0) {
      console.log('🎯 NEXT UPCOMING EVENTS:\n');
      upcoming.forEach((event, i) => {
        const date = new Date(event.start_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        console.log(`   ${i + 1}. ${event.title}`);
        console.log(`      📍 ${event.venue_name || 'TBA'}`);
        console.log(`      📅 ${date}`);
        console.log(`      🔗 ${event.source}\n`);
      });
    }

  } catch (error) {
    console.error('Error generating summary:', error.message);
  }
}

async function main() {
  const startTime = Date.now();

  try {
    // Check if migration has been run
    await checkMigration();

    const results = {
      eventbrite: false,
      nigerian: false
    };

    // Run Eventbrite sync
    results.eventbrite = runScript(
      'scripts/sync-eventbrite-events.js',
      'Eventbrite API Sync'
    );

    // Run Nigerian platforms scraper
    results.nigerian = runScript(
      'scripts/scrape-nigerian-events.js',
      'Nigerian Events Scraper'
    );

    // Display final summary
    await displayFinalSummary();

    // Summary of sync operations
    console.log('='.repeat(50));
    console.log('✅ SYNC OPERATIONS COMPLETE');
    console.log('='.repeat(50) + '\n');

    Object.entries(results).forEach(([source, success]) => {
      const status = success ? '✅' : '❌';
      console.log(`   ${status} ${source}: ${success ? 'Success' : 'Failed'}`);
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Total time: ${duration}s\n`);

    console.log('💡 NEXT STEPS:');
    console.log('==============');
    console.log('1. Check events in your app');
    console.log('2. Set up a cron job to run this daily:');
    console.log('   npm run events:sync');
    console.log('3. Add manual events via Supabase dashboard\n');

  } catch (error) {
    console.error('❌ Master sync failed:', error.message);
    process.exit(1);
  }
}

main();
