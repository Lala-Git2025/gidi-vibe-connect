#!/usr/bin/env node

/**
 * Events System Test
 * Verifies the complete events integration
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

console.log('🧪 EVENTS SYSTEM TEST');
console.log('====================\n');

const tests = [];

async function test(name, fn) {
  try {
    await fn();
    tests.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    tests.push({ name, passed: false, error: error.message });
    console.error(`❌ ${name}: ${error.message}`);
  }
}

async function runTests() {
  console.log('Running tests...\n');

  // Test 1: Database connection
  await test('Database connection', async () => {
    const { error } = await supabase.from('events').select('id').limit(1);
    if (error) throw new Error(error.message);
  });

  // Test 2: Events table exists
  await test('Events table structure', async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, start_date, source, status')
      .limit(1);
    if (error) throw new Error('Events table missing or misconfigured');
  });

  // Test 3: Event saves table exists
  await test('Event saves table', async () => {
    const { error } = await supabase
      .from('event_saves')
      .select('id')
      .limit(1);
    if (error) throw new Error('Event saves table missing');
  });

  // Test 4: Can query upcoming events
  await test('Query upcoming events', async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('start_date', new Date().toISOString())
      .eq('is_active', true)
      .limit(5);
    if (error) throw new Error(error.message);
  });

  // Test 5: Can filter by category
  await test('Filter by category', async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('category', 'Music')
      .limit(5);
    if (error) throw new Error(error.message);
  });

  // Test 6: Can search events
  await test('Search functionality', async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .ilike('title', '%Lagos%')
      .limit(5);
    if (error) throw new Error(error.message);
  });

  // Test 7: Eventbrite API (if configured)
  if (EVENTBRITE_TOKEN) {
    await test('Eventbrite API connection', async () => {
      const response = await fetch(
        'https://www.eventbriteapi.com/v3/users/me/',
        {
          headers: { 'Authorization': `Bearer ${EVENTBRITE_TOKEN}` }
        }
      );
      if (!response.ok) throw new Error('Invalid Eventbrite token');
    });
  } else {
    tests.push({ name: 'Eventbrite API connection', passed: null, skipped: true });
    console.log('⏭️  Eventbrite API connection (skipped - no token)');
  }

  // Test 8: Check for events from different sources
  await test('Multi-source events', async () => {
    const { data } = await supabase
      .from('events')
      .select('source')
      .limit(100);

    const sources = new Set(data?.map(e => e.source) || []);
    if (sources.size === 0) {
      console.log('   ℹ️  No events yet - run npm run events:sync');
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50) + '\n');

  const passed = tests.filter(t => t.passed === true).length;
  const failed = tests.filter(t => t.passed === false).length;
  const skipped = tests.filter(t => t.skipped).length;
  const total = tests.length;

  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  if (skipped > 0) console.log(`⏭️  Skipped: ${skipped}/${total}`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    tests.filter(t => !t.passed && !t.skipped).forEach(t => {
      console.log(`   - ${t.name}: ${t.error}`);
    });
  }

  console.log('');

  if (failed === 0) {
    console.log('🎉 All tests passed! Events system is ready.\n');
    console.log('📝 Next steps:');
    console.log('   1. Run: npm run events:sync');
    console.log('   2. Check events in Supabase dashboard');
    console.log('   3. Integrate events display in your app\n');
  } else {
    console.log('⚠️  Some tests failed. Please fix the issues above.\n');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
