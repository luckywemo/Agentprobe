import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client to bypass RLS for server-side uploads
// Or we can use regular client if RLS allows authenticated users. Given we might not have the user's JWT from standard SSR auth easily here without passing it, using service role is safer for a managed backend.
const supabaseAdminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseAdminUrl, supabaseAdminKey);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const userId = formData.get('userId') as string | null;

        if (!file || !userId) {
            return NextResponse.json({ error: 'File and userId are required' }, { status: 400 });
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
        }

        // Validate file size (e.g., max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileExtension = file.name.split('.').pop();
        const fileName = `${userId}/avatar_${Date.now()}.${fileExtension}`;

        const { data, error } = await supabase
            .storage
            .from('avatars')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true
            });

        if (error) {
            console.error('Supabase storage upload error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const { data: { publicUrl } } = supabase
            .storage
            .from('avatars')
            .getPublicUrl(fileName);

        return NextResponse.json({ url: publicUrl });

    } catch (err) {
        console.error('Upload error:', err);
        return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 });
    }
}
