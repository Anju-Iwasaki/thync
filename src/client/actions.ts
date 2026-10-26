// 端末からDBへの書き込み 担当：岩崎
// 大槻はここの関数だけを呼ぶ。supabase を直接触らない
import { supabase } from '@/lib/supabase/browser';
import type { Message } from '@/types/rows';
import type { ReactionValue } from '@/types/domain';

// サーバーの受付を呼ぶ。分析が終わるのは待たない
// （結果の付箋は Realtime で全員に届くので、ここで受け取る必要がない）
function requestAnalysis(messageId: string, cause: 'send' | 'react'): void {
  fetch('/api/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId, cause }),
  }).catch((e) => console.warn('enqueue に失敗', e));
}

// 返り値の行は画面の一覧に足さないこと。自分の発言も Realtime で届くので二重になる
export async function sendMessage(
  roomId: string,
  memberId: string,
  body: string,
  replyTo?: string
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ room_id: roomId, member_id: memberId, body, reply_to: replyTo ?? null })
    .select()
    .single();
  if (error) throw error;

  // 積むかどうかはサーバーが方式を見て決める。端末は毎回呼ぶだけ
  requestAnalysis(data.id, 'send');
  return data;
}

export async function react(
  messageId: string,
  memberId: string,
  value: ReactionValue
): Promise<void> {
  // 押し直し（賛成→反対）は上書き。主キーが (message_id, member_id) なのでそこで衝突を判定する
  const { error } = await supabase
    .from('reactions')
    .upsert({ message_id: messageId, member_id: memberId, value }, { onConflict: 'message_id,member_id' });
  if (error) throw error;

  // 2人目以降はサーバー側の一意制約で弾かれるので、最初の反応かはここで判定しない
  requestAnalysis(messageId, 'react');
}

export async function unreact(messageId: string, memberId: string): Promise<void> {
  // 付箋は消さない。ジョブも積まない
  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('member_id', memberId);
  if (error) throw error;
}

export async function retractMessage(messageId: string, memberId: string): Promise<void> {
  // 付箋を消すのでブラウザからはできない。サーバー経由
  const res = await fetch('/api/retract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId, memberId }),
  });
  if (!res.ok) throw new Error(`送信取り消しに失敗（${res.status}）`);
}
