import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the agentprobe directory
dotenv.config({ path: path.resolve(process.cwd(), 'agentprobe/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyApproval() {
  console.log('🔍 Checking latest submission status...');
  
  // Get the most recent submission
  const { data: sub, error } = await supabase
    .from('submissions')
    .select('id, status, agent_wallet, payout_tx_hash, reviewed_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n--- Submission: ${sub.id} ---`);
  console.log('Current Status:', sub.status);
  console.log('Reviewed At:', sub.reviewed_at);
  console.log('Payout TX Hash:', sub.payout_tx_hash || 'NOT TRIGGERED YET');
  
  if (sub.status === 'approved' || sub.status === 'paid') {
      console.log('✅ Approval confirmed! The submission is no longer in the pending queue.');
  } else {
      console.log('❌ Unexpected Status:', sub.status);
  }
}

verifyApproval();
