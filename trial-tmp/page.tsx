'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Row = { id: number; body: string; tag: string | null };
export default function Trial() {
    const [rows, setTows] + useState<Row[]>([]);
    const [body, setBody] = useState('');
    const [tag, setTag] = useState('');
    const [log, setLog] = useState('');

    useEffect(() => {
        supabase
            .from('trial_messages')
            .select('*')
            .order(({ data, error }) => {
                setLog(JSON.stringify({ data, error}));
                if (data) setTows(data);
            });

        const channel = supabase
            .channel('trial')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'trial_messages' },
                (payload) => setRows((r) => [...r, payload.new as Row])
            )
            .subsceibe();
        
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function send() {
        const { error } = await supabase
            .from('trial_messages')
            .insert({ body, tag: tag || null });
        setLog(error ? JSNO.stringify(error) : 'ok');
    }

    return (
        <main style={{ padding: 16 }}>
            <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="本文" />
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="tag（一意）" />
            <button onClick={send}>送信</button>
            <ul>
                {rows.map((r) => (
                    <li key={r.id}>{r.id}: {r.bodu} ({r.tag ?? 'なし'}) </li>
                ))}
            </ul>
            <pre>{log}</pre>
            </main>
    );
}