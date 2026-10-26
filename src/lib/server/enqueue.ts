// ジョブ受付 担当：岩崎
import 'server-only';
import { after } from 'next/server';
import { admin } from '@/lib/supabase/server';
import { runNextJob } from '@/lib/analysis/jobs';
import type { Job } from '@/types/rows';
import type { Trigger } from '@/types/domain';

// 端末で何が起きたか。同じ messageId でも、送信か反応かで積むものが変わる
export type Cause = 'send' | 'react';

// 方式の違いはここだけ
async function decideTrigger(messageId: string, cause: Cause): Promise<{ roomId: string; trigger: Trigger } | null> {
  const { data: msg, error } = await admin
    .from('messages')
    .select('room_id, reply_to, retracted_at, rooms(analysis_mode)')
    .eq('id', messageId)
    .single();
  if (error) throw error;
  if (msg.retracted_at) return null;   // 取り消された発言は分析しない

  const mode = msg.rooms?.analysis_mode;
  const roomId = msg.room_id;

  if (mode === 'all') {
    // 全発言：送信で積む。反応は票の記録のみ
    return cause === 'send' ? { roomId, trigger: 'message' } : null;
  }

  // 反応起点
  if (cause === 'react') return { roomId, trigger: 'reaction' };

  // 送信：返信先が付箋（案・問題点）のときだけ積む
  if (!msg.reply_to) return null;
  const { data: target } = await admin
    .from('notes')
    .select('id')
    .eq('source_message_id', msg.reply_to)
    .in('kind', ['idea', 'problem'])
    .maybeSingle();
  return target ? { roomId, trigger: 'reply' } : null;
}

// 積めたら runNextJob を起動する。積まない・重複なら null
export async function enqueue(messageId: string, cause: Cause): Promise<Job | null> {
  const decided = await decideTrigger(messageId, cause);
  if (!decided) return null;

  const { data, error } = await admin
    .from('analysis_jobs')
    .insert({ room_id: decided.roomId, message_id: messageId, trigger: decided.trigger })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return null;   // 2人目以降の反応など。同じ発言を二度分析しない
    throw error;
  }

  // 応答を返したあとに分析を続ける（端末を待たせない。Vercelでも処理が打ち切られない）
  after(() => runNextJob(decided.roomId));
  return data;
}
