const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseIssue() {
  console.log('🔍 Diagnosing stories upload issue...\n');

  try {
    // 1. Check stories table structure
    console.log('1️⃣ Checking stories table structure...');
    const { data: storiesSchema, error: schemaError } = await supabase
      .from('stories')
      .select('*')
      .limit(0);

    if (schemaError) {
      console.error('   ❌ Error accessing stories table:', schemaError.message);
    } else {
      console.log('   ✅ Stories table accessible');
    }

    // 2. Check if media_type column exists
    console.log('\n2️⃣ Checking for media_type column...');
    const { data: sampleStory } = await supabase
      .from('stories')
      .select('media_type')
      .limit(1)
      .single();

    console.log(sampleStory ? '   ✅ media_type column exists' : '   ⚠️  media_type column may not exist');

    // 3. Get current authenticated users
    console.log('\n3️⃣ Checking authenticated users...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('   ❌ Error fetching users:', usersError.message);
    } else {
      console.log(`   ✅ Found ${users.length} authenticated user(s)`);

      // 4. For each user, check if they have a profile
      console.log('\n4️⃣ Checking profiles for each user...');
      for (const user of users) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, user_id, username, full_name')
          .eq('user_id', user.id)
          .single();

        if (profileError || !profile) {
          console.log(`   ❌ User ${user.email} (${user.id}) - NO PROFILE FOUND`);
          console.log('      Creating profile...');

          // Create profile for this user
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              username: user.email?.split('@')[0] || 'user',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              role: 'Consumer'
            });

          if (insertError) {
            console.log(`      ❌ Failed to create profile: ${insertError.message}`);
          } else {
            console.log('      ✅ Profile created successfully');
          }
        } else {
          console.log(`   ✅ User ${user.email} - Profile exists (user_id: ${profile.user_id})`);
        }
      }
    }

    // 5. Check foreign key constraints
    console.log('\n5️⃣ Checking foreign key constraints...');
    const { data: constraints, error: constraintsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'stories'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public';
      `
    });

    if (!constraintsError && constraints) {
      console.log('   Foreign Key Constraints:');
      console.log(JSON.stringify(constraints, null, 2));
    }

    // 6. Test story insert capability
    console.log('\n6️⃣ Testing story insert capability...');
    if (users && users.length > 0) {
      const testUser = users[0];
      console.log(`   Using test user: ${testUser.email}`);

      // Verify profile exists for test
      const { data: testProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', testUser.id)
        .single();

      if (testProfile) {
        console.log('   ✅ Test user has a valid profile');
        console.log(`   Profile user_id: ${testProfile.user_id}`);
        console.log(`   Auth user id: ${testUser.id}`);
        console.log(`   Match: ${testProfile.user_id === testUser.id ? 'YES ✅' : 'NO ❌'}`);
      } else {
        console.log('   ❌ Test user missing profile - this would cause FK constraint error');
      }
    }

    console.log('\n✅ Diagnosis complete!\n');
    console.log('📋 Summary:');
    console.log('   - If any users are missing profiles, they were created');
    console.log('   - Run fix-stories-schema.sql in Supabase SQL Editor to fix FK constraints');
    console.log('   - After running SQL, try uploading a story again\n');

  } catch (error) {
    console.error('\n❌ Diagnosis failed:', error.message);
    console.error(error);
  }
}

diagnoseIssue();
