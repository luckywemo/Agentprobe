import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the agentprobe directory
dotenv.config({ path: path.resolve(process.cwd(), 'agentprobe/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function nukeAndRebuild() {
    console.log('💥 Nuking all pending submissions to ensure a clean state...');

    const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('status', 'pending');

    if (error) {
        console.error('❌ Error nuking submissions:', error);
        return;
    }

    console.log('✅ Pending submissions cleared.');
    console.log('👉 Now run: node agentprobe/scripts/test-managed-automation.mjs');
}

nukeAndRebuild();
