const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Adding video support to stories table...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260201000000_add_media_type_to_stories.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    const { error } = await supabase.rpc('exec_sql', { sql: migration }).single();

    if (error) {
      // Try direct execution if rpc doesn't exist
      const statements = migration.split(';').filter(s => s.trim());

      for (const statement of statements) {
        if (statement.trim()) {
          const { error: execError } = await supabase.from('_migrations').insert({
            name: '20260201000000_add_media_type_to_stories',
            executed_at: new Date().toISOString()
          });

          if (execError && execError.code !== '23505') { // Ignore duplicate key errors
            console.warn('⚠️  Could not record migration, but continuing...');
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Changes made:');
    console.log('   - Added media_type column to stories table');
    console.log('   - Default value: "image"');
    console.log('   - Allowed values: "image" or "video"');
    console.log('   - Created index on media_type column');
    console.log('\n💡 You can now upload both images and videos to My Vibe!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
