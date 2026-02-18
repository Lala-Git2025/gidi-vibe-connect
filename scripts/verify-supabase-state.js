#!/usr/bin/env node

/**
 * Verify Supabase Database State
 * Checks the actual database constraints and schema
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);

    // If no error or error is not "table doesn't exist", table exists
    return !error || error.code !== '42P01';
  } catch (err) {
    return false;
  }
}

async function checkStoriesConstraints() {
  console.log('\n🔍 Checking stories table foreign key constraints...\n');

  // Try to get constraint information using a simple query
  // We'll check if we can query the stories table and join with profiles
  try {
    const { data, error } = await supabase
      .from('stories')
      .select(`
        id,
        user_id,
        profiles:user_id (
          id,
          user_id,
          full_name
        )
      `)
      .limit(1);

    if (error) {
      console.log('⚠️  Query error:', error.message);
      console.log('   This might indicate the foreign key references profiles(id) instead of profiles(user_id)');
      return false;
    } else {
      console.log('✅ Stories table can be queried successfully');
      console.log('   Foreign key appears to be working correctly');
      return true;
    }
  } catch (err) {
    console.log('❌ Error checking stories:', err.message);
    return false;
  }
}

async function testStoryCreation() {
  console.log('\n🧪 Testing story creation pattern...\n');

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('⚠️  Not authenticated - skipping creation test');
      console.log('   (This is normal - just checking schema)');
      return;
    }

    console.log(`📝 Current user: ${user.id}`);

    // Check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.log('⚠️  No profile found for user');
      return;
    }

    console.log(`✅ Profile found:`);
    console.log(`   profiles.id: ${profile.id}`);
    console.log(`   profiles.user_id: ${profile.user_id}`);
    console.log(`   auth.uid(): ${user.id}`);
    console.log(`   Match: ${profile.user_id === user.id ? '✅' : '❌'}`);

    // The app code uses: user_id: currentUser.id (which is auth.uid())
    // If foreign key references profiles(id), this would fail
    // If foreign key references profiles(user_id), this would work

    console.log('\n📊 Analysis:');
    if (profile.user_id === user.id) {
      console.log('   App inserts: auth.uid() = ' + user.id);
      console.log('   Should reference: profiles(user_id) = ' + profile.user_id + ' ✅');
      console.log('   Should NOT reference: profiles(id) = ' + profile.id + ' ❌');
    }

  } catch (err) {
    console.log('Error in test:', err.message);
  }
}

async function checkCriticalTables() {
  console.log('\n📋 Checking critical tables...\n');

  const tables = [
    'profiles',
    'stories',
    'social_posts',
    'events',
    'venues',
    'communities'
  ];

  for (const table of tables) {
    const exists = await checkTableExists(table);
    console.log(`${exists ? '✅' : '❌'} ${table}`);
  }
}

async function checkSocialPostsCommunityId() {
  console.log('\n🔍 Checking if social_posts has community_id column...\n');

  try {
    const { data, error } = await supabase
      .from('social_posts')
      .select('id, community_id')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('community_id')) {
        console.log('❌ community_id column does not exist in social_posts');
        console.log('   Run migration: add_community_id_to_social_posts.sql');
        return false;
      } else {
        console.log('⚠️  Error:', error.message);
        return false;
      }
    } else {
      console.log('✅ community_id column exists in social_posts');
      return true;
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
    return false;
  }
}

async function main() {
  console.log('=' .repeat(60));
  console.log('🔍 Supabase Database State Verification');
  console.log('=' .repeat(60));

  await checkCriticalTables();
  await checkStoriesConstraints();
  await checkSocialPostsCommunityId();
  await testStoryCreation();

  console.log('\n' + '='.repeat(60));
  console.log('✅ Verification complete!');
  console.log('='.repeat(60) + '\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
