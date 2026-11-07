// 送信取り消し 担当：岩崎
import 'server-only';
import { admin } from '@/lib/supabase/server';

// 呼び出し側（route.ts）がHTTPの状態コードに変えるためのエラー
export class RetractError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

// 本人の発言か確認 → retracted_at を入れる → まだ始まっていない分析を止める
// → その発言から作られた付箋を消す（問題点・解決案・理由は CASCADE で一緒に消える）
// → その発言へのリアクションを消す
//
// 途中で失敗しても、もう一度呼べば続きから同じ結果になる（取り消し済みでも削除は行う）
export async function retract(messageId: string, memberId: string): Promise<void> {
  // 1. 本人確認
  const { data: msg, error } = await admin
    .from('messages')
    .select('id, member_id, retracted_at')
    .eq('id', messageId)
    .maybeSingle();
  if (error) throw error;
  if (!msg) throw new RetractError('発言が見つからない', 404);
  if (msg.member_id !== memberId) throw new RetractError('自分の発言しか取り消せない', 403);

  // 2. 取り消しの印を先に付ける。
  //    これ以降、この発言の分析は積まれず（enqueue）、処理中の分析も付箋を作らない（runNextJob）
  if (!msg.retracted_at) {
    const { error: e } = await admin
      .from('messages')
      .update({ retracted_at: new Date().toISOString() })
      .eq('id', messageId);
    if (e) throw e;
  }

  // 3. まだ始まっていない分析を止める
  const jobs = await admin
    .from('analysis_jobs')
    .update({ status: 'done', error: '送信取り消しのため中止' })
    .eq('message_id', messageId)
    .eq('status', 'pending');
  if (jobs.error) throw jobs.error;

  // 4. 付箋を消す。子（問題点・解決案・理由）は DB の on delete cascade で消える
  const notes = await admin.from('notes').delete().eq('source_message_id', messageId);
  if (notes.error) throw notes.error;

  // 5. その発言へのリアクション（票）を消す
  const reactions = await admin.from('reactions').delete().eq('message_id', messageId);
  if (reactions.error) throw reactions.error;
}
