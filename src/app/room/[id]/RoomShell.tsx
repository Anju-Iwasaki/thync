'use client';
// 部屋の入れ物（岩崎）。データは useRoom で1回だけ読み、各ルームに引数で渡す
// 組み込み日に、仮の部品（Dev…）を本番の部品に1行ずつ差し替える
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/browser';
import { useRoom } from '@/client/useRoom';
import DevTalk from '@/components/dev/DevTalk';
import DevBoard from '@/components/dev/DevBoard';
import SummaryRoom from '@/components/summary/SummaryRoom';

type Tab = 'talk' | 'board' | 'summary';
const TABS: { id: Tab; label: string }[] = [
  { id: 'talk', label: 'トーク' },
  { id: 'board', label: 'THYNC' },
  { id: 'summary', label: 'まとめ' },
];

const memberKey = (roomId: string) => `thync:member:${roomId}`;

export default function RoomShell({ roomId }: { roomId: string }) {
  const { room, members, messages, reactions, notes, error } = useRoom(roomId);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('talk');
  const [nickname, setNickname] = useState('');
  const [joinError, setJoinError] = useState('');

  // 自分のメンバーIDはタブごとに覚える（通常ウィンドウとシークレットで別人になる）
  useEffect(() => {
    try {
      setMemberId(sessionStorage.getItem(memberKey(roomId)));
    } catch {}
  }, [roomId]);

  // 参加（まおの JoinForm ができたら差し替える）
  async function join() {
    const { data, error } = await supabase.from('members').insert({ room_id: roomId, nickname }).select().single();
    if (error) return setJoinError(JSON.stringify(error));
    try {
      sessionStorage.setItem(memberKey(roomId), data.id);
    } catch {}
    setMemberId(data.id);
  }

  if (!room) return <main style={{ padding: 16 }}><p>部屋を読み込み中…</p><pre>{error}</pre></main>;

  if (!memberId) {
    return (
      <main style={{ padding: 16 }}>
        <h1>{room.topic}</h1>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="ニックネーム" />
        <button onClick={join} disabled={!nickname.trim()}>参加</button>
        <pre>{joinError}</pre>
      </main>
    );
  }

  return (
    <main style={{ padding: 16 }}>
      <h1>{room.topic}（{room.analysis_mode}）</h1>
      <nav style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} disabled={tab === t.id}>{t.label}</button>
        ))}
      </nav>
      {error && <pre>{error}</pre>}

      {/* ここが差し替える場所。タブを切り替えても useRoom のデータと Realtime は保たれる */}
      {tab === 'talk' && <DevTalk roomId={roomId} memberId={memberId} members={members} messages={messages} reactions={reactions} />}
      {tab === 'board' && <DevBoard notes={notes} scale={room.board_scale} />}
      {tab === 'summary' && <SummaryRoom members={members} notes={notes} reactions={reactions} />}
    </main>
  );
}
