'use client';
// 仮のトーク（岩崎）。 TalkRoomができたらRoomShellから外す
import { useState } from 'react';
import { sendMessage, react, unreact, retractMessage } from '@/client/actions';
import type { TalkRoomProps } from '@/components/talk/TalkRoom';
import type { Message } from '@/types/rows';
import type { ReactionValue } from '@/types/domain';

export default function DevTalk({ memberId, members, messages, reactions, roomId }: TalkRoomProps) {
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [log, setLog] = useState('');

  const run = (f: () => Promise<unknown>) => f().then(() => setLog('ok')).catch((e) => setLog(JSON.stringify(e)));
  const name = (id: string) => members.find((m) => m.id === id)?.nickname ?? '?';
  const count = (id: string, v: string) => reactions.filter((r) => r.message_id === id && r.value === v).length;

  function send() {
    if (!body.trim()) return;
    run(() => sendMessage(roomId, memberId, body, replyTo?.id));
    setBody('');
    setReplyTo(null);
  }

  function toggle(messageId: string, value: ReactionValue) {
    const mine = reactions.find((r) => r.message_id === messageId && r.member_id === memberId);
    run(() => (mine?.value === value ? unreact(messageId, memberId) : react(messageId, memberId, value)));
  }

  return (
    <section>
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
                {m.member_id === memberId && <button onClick={() => run(() => retractMessage(m.id, memberId))}>取消</button>}
              </>
            )}
          </li>
        ))}
      </ul>
      {replyTo && <p>返信先：{replyTo.body.slice(0, 20)} <button onClick={() => setReplyTo(null)}>×</button></p>}
      <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="発言" />
      <button onClick={send}>送信</button>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{log}</pre>
    </section>
  );
}
