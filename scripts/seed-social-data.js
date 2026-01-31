#!/usr/bin/env node

/**
 * Seed Social Data
 * Creates sample user profiles and social posts with Lagos-themed content
 * This provides realistic data to showcase the social features
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: Missing Supabase credentials in .env file');
  console.error('   Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log('🌱 SEEDING SOCIAL DATA');
console.log('=====================\n');

// Sample user profiles
const sampleProfiles = [
  {
    user_id: randomUUID(),
    full_name: 'Femi Adeyemi',
    bio: 'Foodie explorer 🍽️ | Restaurant critic | Always hunting for the best jollof in Lagos',
    role: 'Consumer',
    avatar_url: 'https://ui-avatars.com/api/?name=Femi+Adeyemi&background=EAB308&color=000&size=200'
  },
  {
    user_id: randomUUID(),
    full_name: 'Chioma Nwosu',
    bio: 'Nightlife enthusiast 🌙 | Party lover | Living for the weekend vibes',
    role: 'Consumer',
    avatar_url: 'https://ui-avatars.com/api/?name=Chioma+Nwosu&background=8B5CF6&color=fff&size=200'
  },
  {
    user_id: randomUUID(),
    full_name: 'Tunde Bakare',
    bio: 'Event photographer 📸 | Culture lover | Capturing Lagos one moment at a time',
    role: 'Content Creator',
    avatar_url: 'https://ui-avatars.com/api/?name=Tunde+Bakare&background=3B82F6&color=fff&size=200'
  },
  {
    user_id: randomUUID(),
    full_name: 'Aisha Mohammed',
    bio: 'Local guide 🗺️ | Community builder | Connecting people with amazing experiences',
    role: 'Consumer',
    avatar_url: 'https://ui-avatars.com/api/?name=Aisha+Mohammed&background=EC4899&color=fff&size=200'
  },
  {
    user_id: randomUUID(),
    full_name: 'Emeka Okafor',
    bio: 'Sports fan ⚽ | Venue reviewer | Weekend brunch enthusiast',
    role: 'Consumer',
    avatar_url: 'https://ui-avatars.com/api/?name=Emeka+Okafor&background=10B981&color=fff&size=200'
  }
];

// Function to get random item from array
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Function to get random number in range
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Function to get timestamp from days ago
const getDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

async function getExistingUsers() {
  console.log('👤 Fetching existing authenticated users...\n');

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .limit(10);

  if (error || !data || data.length === 0) {
    console.log('   ℹ️  No existing users found. Posts cannot be created.\n');
    console.log('   📝 Please create at least one account by signing up first.\n');
    return [];
  }

  console.log(`   ✅ Found ${data.length} user(s):\n`);
  data.forEach(user => {
    console.log(`      - ${user.full_name || 'User'}`);
  });

  if (data.length === 1) {
    console.log(`\n   ℹ️  Only one user found. All posts will be attributed to: ${data[0].full_name}`);
    console.log('   💡 Tip: Create more accounts for varied post authors\n');
  } else {
    console.log(`\n   ✅ Posts will be distributed among these ${data.length} users\n`);
  }

  return data;
}

async function seedProfiles() {
  console.log('💡 Suggested user profile names for variety:\n');

  sampleProfiles.forEach(profile => {
    console.log(`   📝 ${profile.full_name} - ${profile.bio.split('|')[0].trim()}`);
  });

  console.log('\n   💡 Tip: Create accounts with these names for varied post authors');
  console.log('   📍 Sign up at: http://localhost:8080/profile\n');

  return sampleProfiles;
}

async function fetchCommunities() {
  console.log('📱 Fetching existing communities...\n');

  const { data, error } = await supabase
    .from('communities')
    .select('id, name, icon');

  if (error) {
    console.error('❌ Failed to fetch communities:', error.message);
    return [];
  }

  console.log(`✅ Found ${data.length} communities\n`);
  data.forEach(c => console.log(`   - ${c.icon} ${c.name}`));
  console.log('');

  return data;
}

async function seedPosts(users, communities) {
  console.log('📝 Creating sample social posts...\n');

  if (!users || users.length === 0) {
    console.log('   ⚠️  No users available. Skipping post creation.');
    console.log('   ℹ️  Please sign up for an account first, then run this script again.\n');
    return 0;
  }

  // Map community names to IDs for easier reference
  const communityMap = {};
  communities.forEach(c => {
    communityMap[c.name] = c.id;
  });

  // Helper to get random user from the list
  const getRandomUser = () => users[Math.floor(Math.random() * users.length)];

  // Sample posts with Lagos-themed content
  // Posts will be distributed among available users
  const posts = [
    {
      user_id: getRandomUser().user_id,
      community_id: communityMap['Nightlife Lagos'],
      content: "Just had the most amazing suya at Kilimanjaro in VI! 🔥 The spice level was perfect and the meat was so tender. Highly recommend for late night cravings!",
      media_urls: ['https://source.unsplash.com/800x600/?nigerian-food,suya,grilled-meat'],
      location: 'Victoria Island, Lagos',
      likes_count: 45,
      comments_count: 8,
      created_at: getDaysAgo(1)
    },
    {
      user_id: getRandomUser().user_id,
      community_id: communityMap['Nightlife Lagos'],
      content: "Quilox on Friday nights never disappoints! The DJ lineup was incredible and the energy was unmatched. See you next weekend! 🎵💃",
      media_urls: ['https://source.unsplash.com/800x600/?nightclub,party,dj'],
      location: 'VI, Lagos',
      likes_count: 89,
      comments_count: 15,
      created_at: getDaysAgo(2)
    },
    {
      user_id: getRandomUser().user_id,
      community_id: communityMap['Events & Concerts'],
      content: "Afronation was INSANE this year! Caught Burna Boy's performance - absolute fire! 🔥 Already counting down to next year",
      media_urls: ['https://source.unsplash.com/800x600/?concert,festival,crowd'],
      location: 'Eko Atlantic, Lagos',
      likes_count: 127,
      comments_count: 23,
      created_at: getDaysAgo(3)
    },
    {
      user_id: getRandomUser().user_id,
      community_id: communityMap['Island Vibes'],
      content: "New rooftop bar opened in Ikoyi - RSVP Lagos. The sunset view is breathtaking and cocktails are on point 🌅🍹",
      media_urls: ['https://source.unsplash.com/800x600/?rooftop,sunset,cocktails'],
      location: 'Ikoyi, Lagos',
      likes_count: 67,
      comments_count: 12,
      created_at: getDaysAgo(4)
    },
    {
      user_id: getRandomUser().user_id,
      community_id: communityMap['Foodies United'],
      content: "Brunch at The Place never gets old. Their pancakes are *chef's kiss* 👨‍🍳 Perfect Sunday vibes",
      media_urls: ['https://source.unsplash.com/800x600/?brunch,pancakes,breakfast'],
      location: 'Lekki, Lagos',
      likes_count: 34,
      comments_count: 5,
      created_at: getDaysAgo(5)
    },
    {
      user_id: getRandomUser().user_id,
      community_id: communityMap['Restaurant Reviews'],
      content: "Discovered this hidden gem in Surulere - Mama Put serves the most authentic Nigerian dishes. The egusi soup reminds me of home! 😋",
      media_urls: ['https://source.unsplash.com/800x600/?nigerian-food,soup,african-cuisine'],
      location: 'Surulere, Lagos',
      likes_count: 56,
      comments_count: 11,
      created_at: getDaysAgo(6)
    },
    {
      user_id: getRandomUser().user_id,
      community_id: communityMap['Party People'],
      content: "Saturday at Cubana was LIT! 🎉 The bottle service was amazing and DJ kept the energy high all night. Worth every naira!",
      media_urls: ['https://source.unsplash.com/800x600/?party,club,celebration'],
      location: 'Victoria Island, Lagos',
      likes_count: 92,
      comments_count: 18,
      created_at: getDaysAgo(7)
    },
    {
      user_id: getRandomUser().user_id,
      community_id: communityMap['Culture & Arts'],
      content: "Visited Nike Art Gallery today. The collection of traditional Nigerian art is breathtaking. A must-visit for culture lovers! 🎨",
      media_urls: ['https://source.unsplash.com/800x600/?african-art,gallery,paintings'],
      location: 'Lekki, Lagos',
      likes_count: 43,
      comments_count: 7,
      created_at: getDaysAgo(8)
    },
    {
      user_id: getRandomUser().user_id,
      community_id: communityMap['Island Vibes'],
      content: "Beach day at Elegushi was exactly what I needed! 🏖️ Perfect weather, good music, and amazing vibes. Lagos summers hit different",
      media_urls: ['https://source.unsplash.com/800x600/?beach,ocean,tropical'],
      location: 'Lekki, Lagos',
      likes_count: 78,
      comments_count: 14,
      created_at: getDaysAgo(9)
    },
    {
      user_id: getRandomUser().user_id,
      community_id: communityMap['Events & Concerts'],
      content: "Caught the Arsenal match screening at Sports Bar VI. The energy was electric! Nothing beats watching the game with fellow fans ⚽🔴",
      media_urls: ['https://source.unsplash.com/800x600/?sports-bar,football,fans'],
      location: 'Victoria Island, Lagos',
      likes_count: 61,
      comments_count: 16,
      created_at: getDaysAgo(10)
    },
    {
      user_id: getRandomUser().user_id,
      community_id: communityMap['Foodies United'],
      content: "Shiro Lagos has the best sushi in town, hands down! 🍣 Fresh ingredients, creative rolls, and beautiful presentation. Definitely coming back!",
      media_urls: ['https://source.unsplash.com/800x600/?sushi,japanese-food,restaurant'],
      location: 'Victoria Island, Lagos',
      likes_count: 87,
      comments_count: 19,
      created_at: getDaysAgo(11)
    },
    {
      user_id: getRandomUser().user_id,
      community_id: communityMap['Mainland Connect'],
      content: "Ikeja City Mall is underrated! Great shops, amazing food court, and perfect for hanging out with friends on a lazy Saturday 🛍️",
      media_urls: ['https://source.unsplash.com/800x600/?shopping-mall,retail,lifestyle'],
      location: 'Ikeja, Lagos',
      likes_count: 52,
      comments_count: 9,
      created_at: getDaysAgo(12)
    },
    {
      user_id: getRandomUser().user_id,
      community_id: communityMap['Events & Concerts'],
      content: "Live jazz night at Bogobiri House was pure magic! 🎷 Intimate venue, talented musicians, great crowd. This is what Lagos nightlife is about!",
      media_urls: ['https://source.unsplash.com/800x600/?jazz,live-music,saxophone'],
      location: 'Ikoyi, Lagos',
      likes_count: 48,
      comments_count: 10,
      created_at: getDaysAgo(13)
    },
    {
      user_id: getRandomUser().user_id,
      community_id: communityMap['Island Vibes'],
      content: "Sunset kayaking at Ikoyi Club! 🚣‍♀️ Who knew Lagos had such peaceful spots? Perfect way to unwind after a busy week",
      media_urls: ['https://source.unsplash.com/800x600/?kayaking,sunset,water-sports'],
      location: 'Ikoyi, Lagos',
      likes_count: 71,
      comments_count: 13,
      created_at: getDaysAgo(14)
    },
    {
      user_id: getRandomUser().user_id,
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
      console.error(`   ❌ Failed to create post ${i + 1} - ${error.message}`);
    } else {
      // Find the user who authored this post
      const author = users.find(u => u.user_id === post.user_id);
      const authorName = author?.full_name || 'User';

      // Extract first few words of content for display
      const preview = post.content.substring(0, 40) + '...';
      console.log(`   ✅ Post ${i + 1} by ${authorName}: "${preview}"`);
      postCount++;
    }
  }

  console.log(`\n✅ Created ${postCount}/${posts.length} posts\n`);
  return postCount;
}

async function updateCommunityMemberCounts() {
  console.log('📊 Updating community member counts...\n');

  const memberCounts = {
    'Nightlife Lagos': 1234,
    'Restaurant Reviews': 2156,
    'Events & Concerts': 987,
    'Island Vibes': 1543,
    'Mainland Connect': 892,
    'Foodies United': 1678,
    'Party People': 756,
    'Culture & Arts': 543
  };

  let updateCount = 0;

  for (const [name, count] of Object.entries(memberCounts)) {
    const { error } = await supabase
      .from('communities')
      .update({ member_count: count })
      .eq('name', name);

    if (error) {
      console.error(`   ❌ Failed: ${name} - ${error.message}`);
    } else {
      console.log(`   ✅ ${name}: ${count.toLocaleString()} members`);
      updateCount++;
    }
  }

  console.log(`\n✅ Updated ${updateCount}/${Object.keys(memberCounts).length} communities\n`);
}

async function displaySummary() {
  console.log('📊 FINAL SUMMARY');
  console.log('================\n');

  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('full_name')
      .in('full_name', sampleProfiles.map(p => p.full_name));

    console.log(`✅ Sample Profiles: ${profiles?.length || 0}/5`);
    if (profiles) {
      profiles.forEach(p => console.log(`   - ${p.full_name}`));
    }

    const { data: posts } = await supabase
      .from('social_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);

    console.log(`\n✅ Social Posts: ${posts?.length || 0}/15`);

    const { data: communities } = await supabase
      .from('communities')
      .select('name, member_count')
      .order('member_count', { ascending: false });

    console.log(`\n✅ Communities:`);
    if (communities) {
      communities.forEach(c => {
        console.log(`   - ${c.name}: ${c.member_count.toLocaleString()} members`);
      });
    }

    console.log('\n🎉 SEEDING COMPLETE!\n');
    console.log('🚀 NEXT STEPS:');
    console.log('==============');
    console.log('1. Start web app: npm run dev');
    console.log('2. Navigate to: http://localhost:8080/social');
    console.log('3. Switch to "Feed" tab to see posts');
    console.log('4. Switch to "Communities" tab to see all communities');
    console.log('5. Try joining a community!\n');

  } catch (error) {
    console.error('Error generating summary:', error.message);
  }
}

async function checkMigration() {
  console.log('🔍 Checking if migration has been run...\n');

  try {
    // Try to query a social post with community_id
    const { data, error } = await supabase
      .from('social_posts')
      .select('id, community_id')
      .limit(1);

    if (error && error.message.includes("community_id")) {
      console.error('❌ Migration not run! The community_id column does not exist.\n');
      console.log('📖 PLEASE RUN THE MIGRATION FIRST:');
      console.log('==================================');
      console.log('1. Go to: https://supabase.com/dashboard/project/xvtjcpwkrsoyrhhptdmc/sql');
      console.log('2. Click "New Query"');
      console.log('3. Copy from: supabase/migrations/add_community_id_to_social_posts.sql');
      console.log('4. Paste and click "Run"\n');
      process.exit(1);
    }

    console.log('✅ Migration verified - community_id column exists\n');
    return true;
  } catch (error) {
    console.error('❌ Error checking migration:', error.message);
    process.exit(1);
  }
}

async function seed() {
  try {
    // 0. Check migration
    await checkMigration();

    // 1. Get existing users
    const users = await getExistingUsers();

    // 2. Show sample profile info
    await seedProfiles();

    // 3. Fetch communities
    const communities = await fetchCommunities();

    if (communities.length === 0) {
      console.error('❌ No communities found. Please run: npm run migrate:seed first');
      process.exit(1);
    }

    // 4. Seed posts
    await seedPosts(users, communities);

    // 5. Update community member counts
    await updateCommunityMemberCounts();

    // 6. Display summary
    await displaySummary();

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();
