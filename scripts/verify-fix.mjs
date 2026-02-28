import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the agentprobe directory
dotenv.config({ path: path.resolve(process.cwd(), 'agentprobe/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFix() {
    const { data: sub, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', '12844e92-7bda-486a-9e15-cc26792ec3d6')
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('✅ Submission Fixed Status:');
    console.log(JSON.stringify(sub.feedback, null, 2));
}

checkFix();
