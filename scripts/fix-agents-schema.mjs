import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSchema() {
  console.log('Attempting to add owner_address column to agents table...');
  
  // Note: Since we can't run arbitrary SQL via the client easily without a pre-defined RPC,
  // we will try to perform a dummy update to see if the column exists, 
  // and if not, we'll suggest the user runs the SQL in the dashboard.
  
  const { error } = await supabase
    .from('agents')
    .select('owner_address')
    .limit(1);

  if (error && error.message.includes('column "owner_address" does not exist')) {
    console.log('Column "owner_address" is missing. Please run this SQL in your Supabase SQL Editor:');
    console.log('ALTER TABLE agents ADD COLUMN owner_address TEXT;');
    console.log('CREATE INDEX idx_agents_owner_address ON agents(owner_address);');
  } else if (error) {
    console.error('Error checking schema:', error.message);
  } else {
    console.log('Column "owner_address" already exists! ✅');
  }
}

fixSchema();
