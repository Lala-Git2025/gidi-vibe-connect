#!/usr/bin/env node

/**
 * Clear and Re-seed Social Posts
 * Deletes all existing posts and creates new ones with better distribution
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

console.log('🧹 CLEAR AND RE-SEED SOCIAL POSTS');
console.log('==================================\n');

// Function to get timestamp from days ago
const getDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

async function clearPosts() {
  console.log('🗑️  Deleting all existing social posts...\n');

  const { error } = await supabase
    .from('social_posts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (error) {
    console.error('❌ Error deleting posts:', error.message);
    return false;
  }

  console.log('✅ All posts deleted\n');
  return true;
}

async function getUsers() {
  console.log('👤 Fetching users...\n');

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .not('full_name', 'is', null)
    .neq('full_name', '')
    .limit(10);

  if (error || !data || data.length === 0) {
    console.log('   ⚠️  No users with names found.\n');
    return [];
  }

  console.log(`   ✅ Found ${data.length} users with names:\n`);
  data.forEach(user => {
    console.log(`      - ${user.full_name}`);
  });
  console.log('');

  return data;
}

async function getCommunities() {
  const { data, error } = await supabase
    .from('communities')
    .select('*')
    .eq('is_active', true);

  if (error || !data) {
    console.error('❌ Error fetching communities');
    return [];
  }

  return data;
}

async function seedPosts(users, communities) {
  console.log('📝 Creating 15 social posts with even distribution...\n');

  if (users.length === 0) {
    console.log('   ⚠️  No users available. Skipping.\n');
    return 0;
  }

  const communityMap = {};
  communities.forEach(c => {
    communityMap[c.name] = c.id;
  });

  // Distribute posts evenly among users
  let userIndex = 0;
  const getUserForPost = () => {
    const user = users[userIndex % users.length];
    userIndex++;
    return user;
  };

  const posts = [
    {
      user_id: getUserForPost().user_id,
      community_id: communityMap['Restaurant Reviews'],
      content: "Just had the most amazing suya at Kilimanjaro in VI! 🔥 The spice level was perfect and the meat was so tender. Highly recommend for late night cravings!",
      media_urls: ['https://source.unsplash.com/800x600/?nigerian-food,suya,grilled-meat'],
      location: 'Victoria Island, Lagos',
      likes_count: 45,
      comments_count: 8,
      created_at: getDaysAgo(1)
    },
    {
      user_id: getUserForPost().user_id,
      community_id: communityMap['Nightlife Lagos'],
      content: "Quilox on Friday nights never disappoints! The DJ lineup was incredible and the energy was unmatched. See you next weekend! 🎵💃",
      media_urls: ['https://source.unsplash.com/800x600/?nightclub,party,dj'],
      location: 'VI, Lagos',
      likes_count: 89,
      comments_count: 15,
      created_at: getDaysAgo(2)
    },
    {
      user_id: getUserForPost().user_id,
      community_id: communityMap['Events & Concerts'],
      content: "Afronation was INSANE this year! Caught Burna Boy's performance - absolute fire! 🔥 Already counting down to next year",
      media_urls: ['https://source.unsplash.com/800x600/?concert,festival,crowd'],
      location: 'Eko Atlantic, Lagos',
      likes_count: 127,
      comments_count: 23,
      created_at: getDaysAgo(3)
    },
    {
      user_id: getUserForPost().user_id,
      community_id: communityMap['Island Vibes'],
      content: "New rooftop bar opened in Ikoyi - RSVP Lagos. The sunset view is breathtaking and cocktails are on point 🌅🍹",
      media_urls: ['https://source.unsplash.com/800x600/?rooftop,sunset,cocktails'],
      location: 'Ikoyi, Lagos',
      likes_count: 67,
      comments_count: 12,
      created_at: getDaysAgo(4)
    },
    {
      user_id: getUserForPost().user_id,
      community_id: communityMap['Foodies United'],
      content: "Brunch at The Place never gets old. Their pancakes are *chef's kiss* 👨‍🍳 Perfect Sunday vibes",
      media_urls: ['https://source.unsplash.com/800x600/?brunch,pancakes,breakfast'],
      location: 'Lekki, Lagos',
      likes_count: 34,
      comments_count: 5,
      created_at: getDaysAgo(5)
    },
    {
      user_id: getUserForPost().user_id,
      community_id: communityMap['Restaurant Reviews'],
      content: "Discovered this hidden gem in Surulere - Mama Put serves the most authentic Nigerian dishes. The egusi soup reminds me of home! 😋",
      media_urls: ['https://source.unsplash.com/800x600/?nigerian-food,soup,african-cuisine'],
      location: 'Surulere, Lagos',
      likes_count: 56,
      comments_count: 11,
      created_at: getDaysAgo(6)
    },
    {
      user_id: getUserForPost().user_id,
      community_id: communityMap['Party People'],
      content: "Saturday at Cubana was LIT! 🎉 The bottle service was amazing and DJ kept the energy high all night. Worth every naira!",
      media_urls: ['https://source.unsplash.com/800x600/?party,club,celebration'],
      location: 'Victoria Island, Lagos',
      likes_count: 92,
      comments_count: 18,
      created_at: getDaysAgo(7)
    },
    {
      user_id: getUserForPost().user_id,
      community_id: communityMap['Culture & Arts'],
      content: "Visited Nike Art Gallery today. The collection of traditional Nigerian art is breathtaking. A must-visit for culture lovers! 🎨",
      media_urls: ['https://source.unsplash.com/800x600/?african-art,gallery,paintings'],
      location: 'Lekki, Lagos',
      likes_count: 43,
      comments_count: 7,
      created_at: getDaysAgo(8)
    },
    {
      user_id: getUserForPost().user_id,
      community_id: communityMap['Island Vibes'],
      content: "Beach day at Elegushi was exactly what I needed! 🏖️ Perfect weather, good music, and amazing vibes. Lagos summers hit different",
      media_urls: ['https://source.unsplash.com/800x600/?beach,ocean,tropical'],
      location: 'Lekki, Lagos',
      likes_count: 78,
      comments_count: 14,
      created_at: getDaysAgo(9)
    },
    {
      user_id: getUserForPost().user_id,
      community_id: communityMap['Events & Concerts'],
      content: "Caught the Arsenal match screening at Sports Bar VI. The energy was electric! Nothing beats watching the game with fellow fans ⚽🔴",
      media_urls: ['https://source.unsplash.com/800x600/?sports-bar,football,fans'],
      location: 'Victoria Island, Lagos',
      likes_count: 61,
      comments_count: 16,
      created_at: getDaysAgo(10)
    },
    {
      user_id: getUserForPost().user_id,
      community_id: communityMap['Foodies United'],
      content: "Shiro Lagos has the best sushi in town, hands down! 🍣 Fresh ingredients, creative rolls, and beautiful presentation. Definitely coming back!",
      media_urls: ['https://source.unsplash.com/800x600/?sushi,japanese-food,restaurant'],
      location: 'Victoria Island, Lagos',
      likes_count: 87,
      comments_count: 19,
      created_at: getDaysAgo(11)
    },
    {
      user_id: getUserForPost().user_id,
      community_id: communityMap['Mainland Connect'],
      content: "Ikeja City Mall is underrated! Great shops, amazing food court, and perfect for hanging out with friends on a lazy Saturday 🛍️",
      media_urls: ['https://source.unsplash.com/800x600/?shopping-mall,retail,lifestyle'],
      location: 'Ikeja, Lagos',
      likes_count: 52,
      comments_count: 9,
      created_at: getDaysAgo(12)
    },
    {
      user_id: getUserForPost().user_id,
      community_id: communityMap['Events & Concerts'],
      content: "Live jazz night at Bogobiri House was pure magic! 🎷 Intimate venue, talented musicians, great crowd. This is what Lagos nightlife is about!",
      media_urls: ['https://source.unsplash.com/800x600/?jazz,live-music,saxophone'],
      location: 'Ikoyi, Lagos',
      likes_count: 48,
      comments_count: 10,
      created_at: getDaysAgo(13)
    },
    {
      user_id: getUserForPost().user_id,
      community_id: communityMap['Island Vibes'],
      content: "Sunset kayaking at Ikoyi Club! 🚣‍♀️ Who knew Lagos had such peaceful spots? Perfect way to unwind after a busy week",
      media_urls: ['https://source.unsplash.com/800x600/?kayaking,sunset,water-sports'],
      location: 'Ikoyi, Lagos',
      likes_count: 71,
      comments_count: 13,
      created_at: getDaysAgo(14)
    },
    {
      user_id: getUserForPost().user_id,
      community_id: communityMap['Restaurant Reviews'],
      content: "Terra Kulture's menu is 🔥! Tried the ofada rice with ayamase sauce - best I've had outside my mom's kitchen. Support local excellence! 💪",
      media_urls: ['https://source.unsplash.com/800x600/?african-cuisine,rice,traditional-food'],
      location: 'Victoria Island, Lagos',
      likes_count: 95,
      comments_count: 21,
      created_at: getDaysAgo(15)
    }
  ];

  let postCount = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const { error } = await supabase
      .from('social_posts')
      .insert(post);

    if (error) {
      console.error(`   ❌ Failed: Post ${i + 1} - ${error.message}`);
    } else {
      const author = users.find(u => u.user_id === post.user_id);
      const authorName = author?.full_name || 'User';
      const preview = post.content.substring(0, 35);
      console.log(`   ✅ Post ${i + 1} by ${authorName}: "${preview}..."`);
      postCount++;
    }
  }

  console.log(`\n✅ Created ${postCount}/${posts.length} posts\n`);
  return postCount;
}

async function main() {
  try {
    // Step 1: Clear all posts
    const cleared = await clearPosts();
    if (!cleared) {
      process.exit(1);
    }

    // Step 2: Get users with names
    const users = await getUsers();
    if (users.length === 0) {
      console.error('❌ No users found. Please create accounts first.');
      process.exit(1);
    }

    // Step 3: Get communities
    const communities = await getCommunities();
    if (communities.length === 0) {
      console.error('❌ No communities found.');
      process.exit(1);
    }

    // Step 4: Seed posts with even distribution
    await seedPosts(users, communities);

    console.log('\n✅ DONE! Posts re-seeded with even distribution.');
    console.log('\n📱 Now restart your consumer app to see the changes.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
