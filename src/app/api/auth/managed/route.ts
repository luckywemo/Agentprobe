import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

/**
 * POST /api/auth/managed
 * Input: { user_id: string }
 * Logic: 
 * 1. Check if user exists in 'users' table.
 * 2. If yes, return their managed_wallet_address.
 * 3. If no, generate a new wallet, save it, and return the address.
 */
export async function POST(request: NextRequest) {
    const supabase = getServerSupabase();

    try {
        const { user_id, password, role } = await request.json();

        if (!user_id || user_id.length < 3) {
            return NextResponse.json({ error: 'User ID must be at least 3 characters' }, { status: 400 });
        }
        if (!password || password.length < 4) {
            return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
        }

        const normalizedId = user_id.toLowerCase().trim();

        // 1. Check existing user
        const { data: user, error: fetchErr } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', normalizedId)
            .single();

        if (fetchErr && fetchErr.code !== 'PGRST116') {
            console.error('Fetch error:', fetchErr);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (user) {
            // Simple password check for MVP
            if (user.password_hash !== password) {
                return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
            }

            return NextResponse.json({
                message: 'Logged in successfully',
                id: user.id,
                user_id: user.user_id,
                wallet_address: user.wallet_address,
                role: user.role
            });
        }

        // 2. Register New User with Managed Wallet
        if (!role || !['founder', 'bot-hub'].includes(role)) {
            return NextResponse.json({ error: 'Valid role is required for registration' }, { status: 400 });
        }

        const privateKey = generatePrivateKey();
        const account = privateKeyToAccount(privateKey);
        const walletAddress = account.address;

        const { data: newUser, error: insertErr } = await supabase
            .from('users')
            .insert({
                user_id: normalizedId,
                password_hash: password, // Note: In production, hash this with bcrypt/argon2
                role: role,
                wallet_address: walletAddress.toLowerCase(),
                encrypted_private_key: privateKey
            })
            .select()
            .single();

        if (insertErr) {
            console.error('Insert error:', insertErr);
            return NextResponse.json({ error: insertErr.message }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Account created with managed wallet',
            id: newUser.id,
            user_id: newUser.user_id,
            wallet_address: newUser.wallet_address,
            role: newUser.role
        }, { status: 201 });

    } catch (err) {
        console.error('Auth error:', err);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
