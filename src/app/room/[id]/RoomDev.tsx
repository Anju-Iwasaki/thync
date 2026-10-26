'use client';
// 骨組み確認用の仮画面
// 確認しやすいように3つを横に並べている。本番のタブ分けは大槻の担当
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/browser';
import { sendMessage, react, unreact, retractMessage } from '@/client/actions';
import { useRoom } from '@/client/useRoom';
import type { Message } from '@/types/rows';
import type { ReactionValue } from '@/types/domain';

const memberKey = (roomId: string) => `thync:member:${roomId}`;

export default function RoomDev({ roomId }: { roomId: string }) {
  const { room, members, messages, reactions, notes, error } = useRoom(roomId);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [log, setLog] = useState('');

  // 自分のメンバーIDはタブごとに覚える
  useEffect(() => {
    try {
      setMemberId(sessionStorage.getItem(memberKey(roomId)));
    } catch {}
  }, [roomId]);

  // 失敗はログ欄に出す
  const run = (f: () => Promise<unknown>) => f().then(() => setLog('ok')).catch((e) => setLog(JSON.stringify(e)));

  async function join() {
    const { data, error } = await supabase
      .from('members')
      .insert({ room_id: roomId, nickname })
      .select()
      .single();
    if (error) return setLog(JSON.stringify(error));
    try {
      sessionStorage.setItem(memberKey(roomId), data.id);
    } catch {}
    setMemberId(data.id);
  }

  function send() {
    if (!memberId || !body.trim()) return;
    run(() => sendMessage(roomId, memberId, body, replyTo?.id));
    setBody('');
    setReplyTo(null);
  }

  function toggle(messageId: string, value: ReactionValue) {
    if (!memberId) return;
    const mine = reactions.find((r) => r.message_id === messageId && r.member_id === memberId);
    run(() => (mine?.value === value ? unreact(messageId, memberId) : react(messageId, memberId, value)));
  }

  const name = (id: string) => members.find((m) => m.id === id)?.nickname ?? '?';
  const count = (messageId: string, value: string) =>
    reactions.filter((r) => r.message_id === messageId && r.value === value).length;
  const children = (parentId: string | null, kind: string) =>
    notes.filter((n) => n.parent_id === parentId && n.kind === kind);

  if (!room) return <main style={{ padding: 16 }}><p>部屋を読み込み中…</p><pre>{error ?? log}</pre></main>;

  if (!memberId) {
    return (
      <main style={{ padding: 16 }}>
        <h1>{room.topic}</h1>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="ニックネーム" />
        <button onClick={join} disabled={!nickname.trim()}>参加</button>
        <pre>{error ?? log}</pre>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 24 }}>
      <section>
        <h2>トーク：{room.topic}（{room.analysis_mode}）</h2>
        <p>あなた：{name(memberId)}</p>
        <ul>
          {messages.map((m) => (
            <li key={m.id} style={{ marginBottom: 8 }}>
              {m.reply_to && <small>↳ {messages.find((x) => x.id === m.reply_to)?.body.slice(0, 15)} への返信<br /></small>}
              <b>{name(m.member_id)}</b>：{m.retracted_at ? <i>（取り消されました）</i> : m.body}
              {!m.retracted_at && (
                <>
                  {' '}
                  <button onClick={() => toggle(m.id, 'pro')}>賛 {count(m.id, 'pro')}</button>
                  <button onClick={() => toggle(m.id, 'con')}>反 {count(m.id, 'con')}</button>
                  <button onClick={() => setReplyTo(m)}>返信</button>
                  {m.member_id === memberId && (
                    <button onClick={() => run(() => retractMessage(m.id, memberId))}>取消</button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
        {replyTo && (
          <p>
            返信先：{replyTo.body.slice(0, 20)} <button onClick={() => setReplyTo(null)}>×</button>
          </p>
        )}
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="発言" />
        <button onClick={send}>送信</button>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{error ?? log}</pre>
      </section>

      <section>
        <h2>ボード（倍率 {room.board_scale}）</h2>
        {children(null, 'idea').length === 0 && <p>付箋なし</p>}
        <ul>
          {children(null, 'idea').map((idea) => (
            <li key={idea.id}>
              <b>案：{idea.label}</b>（{name(idea.proposer_id)}・x={idea.x}, y={idea.y}）
              <ul>
                {children(idea.id, 'reason').map((r) => <li key={r.id}>理由：{r.label}</li>)}
                {children(idea.id, 'problem').map((p) => (
                  <li key={p.id}>
                    問題：{p.label}
                    <ul>{children(p.id, 'solution').map((s) => <li key={s.id}>解決：{s.label}</li>)}</ul>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <h2>まとめ</h2>
        <p>（大槻の buildSummary ができたらここに出す）</p>
      </section>
    </main>
  );
}
