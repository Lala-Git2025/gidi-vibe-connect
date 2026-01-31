#!/usr/bin/env node

/**
 * Test Social Query
 * Verifies the data and foreign key relationships
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

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log('🔍 TESTING SOCIAL POSTS QUERY');
console.log('=============================\n');

async function test() {
  // Test 1: Check social_posts data
  console.log('1️⃣ Checking social_posts table...\n');

  const { data: posts, error: postsError } = await supabase
    .from('social_posts')
    .select('id, user_id, content, community_id')
    .limit(3);

  if (postsError) {
    console.error('❌ Error fetching posts:', postsError.message);
  } else {
    console.log(`✅ Found ${posts.length} posts`);
    posts.forEach((post, i) => {
      console.log(`   Post ${i + 1}:`);
      console.log(`   - ID: ${post.id}`);
      console.log(`   - user_id: ${post.user_id}`);
      console.log(`   - community_id: ${post.community_id}`);
      console.log(`   - content: ${post.content.substring(0, 50)}...\n`);
    });
  }

  // Test 2: Check profiles for matching user_ids
  console.log('2️⃣ Checking profiles for post authors...\n');

  if (posts && posts.length > 0) {
    for (const post of posts) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('user_id', post.user_id)
        .single();

      if (profileError) {
        console.log(`   ❌ No profile found for user_id: ${post.user_id}`);
        console.log(`      Error: ${profileError.message}\n`);
      } else {
        console.log(`   ✅ Profile found: ${profile.full_name} (${profile.user_id})\n`);
      }
    }
  }

  // Test 3: Test the actual query with join
  console.log('3️⃣ Testing query with join...\n');

  const { data: joinedData, error: joinError } = await supabase
    .from('social_posts')
    .select(`
      *,
      profiles(full_name, avatar_url),
      communities(name, icon)
    `)
    .limit(3);

  if (joinError) {
    console.error('❌ Join query error:', joinError.message);
  } else {
    console.log(`✅ Join query successful - ${joinedData.length} posts returned`);
    joinedData.forEach((post, i) => {
      console.log(`\n   Post ${i + 1}:`);
      console.log(`   - Content: ${post.content.substring(0, 40)}...`);
      console.log(`   - Author data:`, post.profiles);
      console.log(`   - Community data:`, post.communities);
    });
  }
}

test().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
