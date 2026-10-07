const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'server/.env' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testDb() {
  console.log('Testing DB connection with provided key...');
  const { data, error } = await supabase.from('users').select('id').limit(1);
  if (error) {
    console.error('DB Error:', error.message);
    if (error.message.includes('row-level security')) {
       console.log('\n❌ RLS Error Detected: The provided SUPABASE_SERVICE_ROLE_KEY appears to be an anon key or does not have bypass RLS privileges.');
    }
  } else {
    console.log('✅ DB Connection Successful. Role has necessary access.');
  }
}
testDb();
