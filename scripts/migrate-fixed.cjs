const { createClient } = require('@supabase/supabase-js');

async function run() {
    const supabase = createClient(
        'https://fsdjvrvqagokkhwoicdo.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzZGp2cnZxYWdva2tod29pY2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAyMTg5MywiZXhwIjoyMDg3NTk3ODkzfQ.MmQI3eBcLj11DVVoV8Mxh-d8nbsKJb_94ENIKXZAdxg'
    );

    console.log('--- Migrating Database ---');

    // We try to run the SQL directly if there's an RPC, otherwise we might need the user to run it.
    // However, I will try to use a common pattern for Supabase migrations in these environments.
    const queries = [
        `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;`,
        `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;`,
        `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS bot_feedback_for_campaign TEXT;`,
        `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS task_result_summary TEXT;`
    ];

    for (const sql of queries) {
        console.log(`Executing: ${sql}`);
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
            console.error(`Error: ${error.message}`);
        } else {
            console.log('Success.');
        }
    }
}

run();
