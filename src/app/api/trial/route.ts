import { createClient } from '@supabase/supabase-js'

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export async function POST(req: Request) {
    const { body } = await req.json();
    const { error } = await admin
        .from('trial_messages')
        .insert({ body: `[サーバー] ${body}` });
    if (error) return Response.json(error, {status: 500 });
    return Response.json({ ok: true });
}