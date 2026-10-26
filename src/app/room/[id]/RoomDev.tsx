'use client';
// 骨組み確認用の仮画面
// TalkRoom、森のBoardができたら差し替える
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/browser';
import { sendMessage, react, unreact, retractMessage } from '@/client/actions';
import type { Member, Message, Note, Reaction, Room } from '@/types/rows';
import type { ReactionValue } from '@/types/domain';

const memberKey = (roomId: string) => `thync:member:${roomId}`;

function upsertById<T extends { id: string }>(list: T[], row: T): T[] {
  return list.some((x) => x.id === row.id)
    ? list.map((x) => (x.id === row.id ? row : x))
    : [...list, row];
}

export default function RoomDev({ roomId }: { roomId: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [log, setLog] = useState('');

  useEffect(() => {
    // 自分のメンバーIDはタブごとに覚える（通常ウィンドウとシークレットで別人になる）
    try {
      setMemberId(sessionStorage.getItem(memberKey(roomId)));
    } catch {}

    // 最初の読み込み
    (async () => {
      const [r, m, msg, n] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', roomId).single(),
        supabase.from('members').select('*').eq('room_id', roomId),
        supabase.from('messages').select('*').eq('room_id', roomId).order('created_at'),
        supabase.from('notes').select('*').eq('room_id', roomId).order('created_at'),
      ]);
      if (r.error) return setLog(JSON.stringify(r.error));
      setRoom(r.data);
      setMembers(m.data ?? []);
      setMessages(msg.data ?? []);
      setNotes(n.data ?? []);
      // reactions には room_id がないので、この部屋の発言のIDで絞る
      const ids = (msg.data ?? []).map((x) => x.id);
      if (ids.length) {
        const re = await supabase.from('reactions').select('*').in('message_id', ids);
        setReactions(re.data ?? []);
      }
    })();

    // Realtime。DELETE のイベントは主キーしか届かず、絞り込みもできないので部屋で絞らない
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (p) => setRoom(p.new as Room))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'members', filter: `room_id=eq.${roomId}` },
        (p) => setMembers((l) => upsertById(l, p.new as Member)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (p) => p.eventType !== 'DELETE' && setMessages((l) => upsertById(l, p.new as Message)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notes', filter: `room_id=eq.${roomId}` },
        (p) => setNotes((l) => upsertById(l, p.new as Note)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notes' },
        (p) => setNotes((l) => l.filter((x) => x.id !== (p.old as { id: string }).id)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, (p) => {
        const key = (p.eventType === 'DELETE' ? p.old : p.new) as Reaction;
        setReactions((l) => {
          const rest = l.filter((x) => !(x.message_id === key.message_id && x.member_id === key.member_id));
          return p.eventType === 'DELETE' ? rest : [...rest, p.new as Reaction];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  if (!room) return <main style={{ padding: 16 }}><p>部屋を読み込み中…</p><pre>{log}</pre></main>;

  if (!memberId) {
    return (
      <main style={{ padding: 16 }}>
        <h1>{room.topic}</h1>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="ニックネーム" />
        <button onClick={join} disabled={!nickname.trim()}>参加</button>
        <pre>{log}</pre>
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
        <pre style={{ whiteSpace: 'pre-wrap' }}>{log}</pre>
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
        <p>（まおの buildSummary ができたらここに出す）</p>
      </section>
    </main>
  );
}
