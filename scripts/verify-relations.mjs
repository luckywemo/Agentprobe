import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the agentprobe directory
dotenv.config({ path: path.resolve(process.cwd(), 'agentprobe/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRelations() {
    const SUB_ID = '12844e92-7bda-486a-9e15-cc26792ec3d6';

    console.log(`🔍 Verifying relations for submission ${SUB_ID}...`);

    const { data: sub, error: subError } = await supabase
        .from('submissions')
        .select('*, tasks(title), agents(name)')
        .eq('id', SUB_ID)
        .single();

    if (subError) {
        console.error('❌ API Query Error:', subError);
        return;
    }

    console.log('Submission ID:', sub.id);
    console.log('Task exists:', !!sub.tasks, sub.tasks?.title);
    console.log('Agent exists:', !!sub.agents, sub.agents?.name);

    if (!sub.tasks || !sub.agents) {
        console.log('⚠️ Warning: Relations are missing! This might break the UI.');
    } else {
        console.log('✅ Relations are valid.');
    }
}

verifyRelations();
