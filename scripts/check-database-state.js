#!/usr/bin/env node

/**
 * Check Database State
 * Verify users, posts, and their relationships
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

console.log('🔍 DATABASE STATE CHECK');
console.log('======================\n');

async function check() {
  // Check users
  console.log('👥 USERS IN DATABASE:\n');

  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error('❌ Error fetching users:', usersError.message);
  } else {
    console.log(`✅ Total users: ${users.length}\n`);
    users.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.full_name || 'Unnamed'} (${user.user_id})`);
    });
  }

  // Check posts distribution
  console.log('\n\n📝 POSTS DISTRIBUTION:\n');

  const { data: posts, error: postsError } = await supabase
    .from('social_posts')
    .select('id, user_id, content, created_at');

  if (postsError) {
    console.error('❌ Error fetching posts:', postsError.message);
  } else {
    console.log(`✅ Total posts: ${posts.length}\n`);

    // Count posts per user
    const postsByUser = {};
    posts.forEach(post => {
      if (!postsByUser[post.user_id]) {
        postsByUser[post.user_id] = 0;
      }
      postsByUser[post.user_id]++;
    });

    console.log('Posts per user:\n');
    Object.entries(postsByUser).forEach(([userId, count]) => {
      const user = users?.find(u => u.user_id === userId);
      const userName = user?.full_name || 'Unknown User';
      console.log(`   - ${userName}: ${count} posts`);
    });
  }

  // Test actual query with joins
  console.log('\n\n🔗 TESTING JOIN QUERY:\n');

  const { data: joinedPosts, error: joinError } = await supabase
    .from('social_posts')
    .select(`
      id,
      content,
      profiles(full_name, avatar_url),
      communities(name, icon)
    `)
    .limit(5);

  if (joinError) {
    console.error('❌ Join query error:', joinError.message);
  } else {
    console.log(`✅ Successfully fetched ${joinedPosts.length} posts with joins\n`);
    joinedPosts.forEach((post, i) => {
      const preview = post.content.substring(0, 50);
      console.log(`Post ${i + 1}:`);
      console.log(`   Content: ${preview}...`);
      console.log(`   Author: ${post.profiles?.full_name || 'NO PROFILE DATA'}`);
      console.log(`   Community: ${post.communities?.name || 'NO COMMUNITY DATA'}\n`);
    });
  }
}

check().catch(error => {
  console.error('❌ Check failed:', error.message);
  process.exit(1);
});
