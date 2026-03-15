import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

/**
 * POST /api/profile/update-password
 * Input: { supabase_id: string, new_password: string }
 * Logic: Updates the password_hash in the users table for the given supabase/google ID.
 */
export async function POST(request: NextRequest) {
    const supabaseClient = getServerSupabase();

    try {
        const { supabase_id, new_password } = await request.json();

        if (!supabase_id || !new_password) {
            return NextResponse.json({ error: 'Supabase ID and new password are required' }, { status: 400 });
        }

        // We lookup by google_id since that's where we store the Supabase Auth ID for Google users
        // OR by the primary 'id' if the session ID matches our internal UUID
        const { data: user, error: fetchError } = await supabaseClient
            .from('users')
            .select('id, user_id, email, google_id')
            .or(`google_id.eq.${supabase_id},id.eq.${supabase_id}`)
            .single();

        if (fetchError || !user) {
            // If not found by ID, try finding by email if Supabase Auth provides it
            // This handles legacy users who just registered their email for recovery
            const { data: { user: authUser } } = await supabaseClient.auth.admin.getUserById(supabase_id);
            if (authUser?.email) {
                const { data: userByEmail, error: emailError } = await supabaseClient
                    .from('users')
                    .select('id')
                    .eq('email', authUser.email)
                    .single();

                if (userByEmail) {
                    const { error: updateError } = await supabaseClient
                        .from('users')
                        .update({
                            password_hash: new_password,
                            google_id: supabase_id // Link them for future logins
                        })
                        .eq('id', userByEmail.id);

                    if (updateError) throw updateError;
                    return NextResponse.json({ message: 'Password updated and account linked' });
                }
            }

            return NextResponse.json({ error: 'User record not found in internal database' }, { status: 404 });
        }

        // Update the password
        const { error: updateError } = await supabaseClient
            .from('users')
            .update({ password_hash: new_password })
            .eq('id', user.id);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({ message: 'Legacy password synced successfully' });

    } catch (err: any) {
        console.error('[Update Password API] Error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
