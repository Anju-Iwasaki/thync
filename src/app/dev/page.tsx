'use client';
// 骨組み確認用の部屋作成。src/app/page.tsxができたら消す
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createRoom } from '@/client/actions';
import { DEFAULT_ANALYSIS_MODE } from '@/constants';

export default function DevPage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');

  async function create() {
    try {
      const room = await createRoom(topic);
      router.push(`/room/${room.id}`);
    } catch (e) {
      setError(JSON.stringify(e));
    }
  }

  return (
    <main style={{ padding: 16 }}>
      <h1>部屋を作る（開発用）</h1>
      <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="議題" />
      <button onClick={create} disabled={!topic.trim()}>作成</button>
      <p>方式：{DEFAULT_ANALYSIS_MODE}</p>
      <pre>{error}</pre>
      <h2>部品の試しページ（見本データ）</h2>
      <ul>
        <li><Link href="/dev/board">ボード（森）</Link></li>
        <li><Link href="/dev/talk">トーク（大槻）</Link></li>
        <li><Link href="/dev/summary">まとめ（大槻）</Link></li>
      </ul>
    </main>
  );
}
