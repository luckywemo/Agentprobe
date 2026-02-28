import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the agentprobe directory
dotenv.config({ path: path.resolve(process.cwd(), 'agentprobe/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAllSubmissions() {
    console.log('🔍 Inspecting ALL pending submissions...');

    const { data: submissions, error } = await supabase
        .from('submissions')
        .select('id, feedback, status')
        .eq('status', 'pending');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${submissions.length} pending submissions.`);

    for (const sub of submissions) {
        console.log(`\n--- Submission: ${sub.id} ---`);
        console.log('Feedback keys:', Object.keys(sub.feedback || {}));
        if (sub.feedback && sub.feedback.scores) {
            console.log('Scores:', sub.feedback.scores);
        } else {
            console.log('❌ MISSING SCORES');
        }
        if (sub.feedback && sub.feedback.steps_completed) {
            console.log('Steps:', sub.feedback.steps_completed.length);
        } else {
            console.log('❌ MISSING STEPS_COMPLETED');
        }
    }
}

inspectAllSubmissions();
