import { getServerSupabase } from '../src/lib/supabase';

async function run() {
    console.log('--- Migrating Database for Campaign Lifecycle Features ---');
    const supabase = getServerSupabase();

    const queries = [
        'ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;',
        'ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;',
        'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS bot_feedback_for_campaign TEXT;',
        'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS task_result_summary TEXT;'
    ];

    for (const sql of queries) {
        console.log(`Executing: ${sql}`);
        // We use exec_sql RPC which we created earlier or expect to exist
        const { error } = await (supabase as any).rpc('exec_sql', { sql });
        if (error) {
            console.error(`Error executing SQL: ${error.message}`);
        } else {
            console.log('Success.');
        }
    }
}

run().catch(console.error);
