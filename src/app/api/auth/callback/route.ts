import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const role = requestUrl.searchParams.get('role') || 'bot-hub';
    const supabase = getServerSupabase();

    if (code) {
        // 1. Exchange code for session
        const { data: { user }, error: authErr } = await supabase.auth.exchangeCodeForSession(code);

        if (authErr || !user) {
            console.error('[Callback] Auth exchange error:', authErr);
            return NextResponse.redirect(`${requestUrl.origin}/dashboard?error=auth_failed`);
        }

        // 2. Check for existing profile in 'users' table
        const { data: existingUser, error: fetchErr } = await supabase
            .from('users')
            .select('*')
            .eq('google_id', user.id)
            .single();

        if (fetchErr && fetchErr.code !== 'PGRST116') {
            console.error('[Callback] Profile fetch error:', fetchErr);
            return NextResponse.redirect(`${requestUrl.origin}/dashboard?error=db_error`);
        }

        if (!existingUser) {
            console.log('[Callback] New user detected, provisioning managed wallet for:', user.email);

            // 3. Provision new managed wallet
            const privateKey = generatePrivateKey();
            const account = privateKeyToAccount(privateKey);
            const walletAddress = account.address;

            const { error: insertErr } = await supabase
                .from('users')
                .insert({
                    user_id: user.email?.split('@')[0] || user.id.slice(0, 8),
                    google_id: user.id,
                    role: role as 'founder' | 'bot-hub',
                    wallet_address: walletAddress.toLowerCase(),
                    encrypted_private_key: privateKey,
                    display_name: user.user_metadata.full_name || user.email?.split('@')[0],
                    avatar_url: user.user_metadata.avatar_url,
                    bot_slots: 1
                });

            if (insertErr) {
                console.error('[Callback] Profile provisioning error:', insertErr);
                return NextResponse.redirect(`${requestUrl.origin}/dashboard?error=provisioning_failed`);
            }
        }

        // 4. Redirect to dashboard on success
        // We handle session local storage sync on the client side if needed, 
        // but Supabase auth should handle the session cookie.
        return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
    }

    return NextResponse.redirect(`${requestUrl.origin}/dashboard?error=no_code`);
}
