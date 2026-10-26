'use client';
// 骨組み確認用の部屋作成
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/browser';
import { DEFAULT_ANALYSIS_MODE } from '@/constants';

export default function DevPage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');

  async function create() {
    const { data, error } = await supabase
      .from('rooms')
      .insert({ topic, analysis_mode: DEFAULT_ANALYSIS_MODE })
      .select()
      .single();
    if (error) return setError(JSON.stringify(error));
    router.push(`/room/${data.id}`);
  }

  return (
    <main style={{ padding: 16 }}>
      <h1>部屋を作る（開発用）</h1>
      <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="議題" />
      <button onClick={create} disabled={!topic.trim()}>作成</button>
      <p>方式：{DEFAULT_ANALYSIS_MODE}</p>
      <pre>{error}</pre>
    </main>
  );
}
