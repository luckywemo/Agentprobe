import { getServerSupabase } from '../src/lib/supabase';

async function setup() {
    const supabase = getServerSupabase();
    console.log('--- Setting up RPCs for counter increments ---');

    const sqlFunctions = [
        `CREATE OR REPLACE FUNCTION increment_task_completions(t_id UUID) 
         RETURNS void AS $$ 
         UPDATE tasks SET completions_count = completions_count + 1 WHERE id = t_id; 
         $$ LANGUAGE sql;`,

        `CREATE OR REPLACE FUNCTION increment_agent_submissions(a_id UUID) 
         RETURNS void AS $$ 
         UPDATE agents SET total_submissions = total_submissions + 1 WHERE id = a_id; 
         $$ LANGUAGE sql;`
    ];

    for (const sql of sqlFunctions) {
        // Note: exec_sql must be enabled in Supabase, or use a workaround
        const { error } = await (supabase as any).rpc('exec_sql', { sql });
        if (error) {
            console.error('Error creating RPC:', error.message);
            console.log('Falling back to local increment logic if RPC creation fails.');
        } else {
            console.log('RPC created successfully.');
        }
    }
}

setup().catch(console.error);
