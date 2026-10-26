// ジョブ処理とDBの読み書き 担当：岩崎
// DBを使うのはこのファイルだけ。テスト（replay）からは読み込まない
import 'server-only';
import { admin } from '@/lib/supabase/server';
import { ANALYSIS_LOCK_TIMEOUT_MS } from '@/constants';
import { analyze } from './analyze';
import { buildInput, type InputContext } from './input';
import { buildState } from './state';
import { toNoteDraft } from './diff';
import { embed } from '@/lib/llm/embed';
import { placeIdea } from '@/lib/layout/placeIdea';
import type { BoardState, IdMap } from '@/types/state';
import type { NoteDraft } from '@/types/diff';
import type { Job, Note } from '@/types/rows';

const UNIQUE_VIOLATION = '23505';

// ジョブを1件つかむ
// running は部屋に1件まで。2つ目はDBが23505で弾く
async function claimJob(roomId: string): Promise<Job | null> {
  const now = new Date();

  //時間切れのrunningがあれば奪う（処理中に関数が落ちたもの）
  const cutoff = new Date(now.getTime() - ANALYSIS_LOCK_TIMEOUT_MS).toISOString();
  const stolen = await admin
    .from('analysis_jobs')
    .update({ locked_at: now.toISOString() })
    .eq('room_id', roomId)
    .eq('status', 'running')
    .lt('locked_at', cutoff)
    .select();
  if (stolen.error) throw stolen.error;
  if (stolen.data.length) return stolen.data[0];

  // 最古のpendingをrunningにする
  const oldest = await admin
    .from('analysis_jobs')
    .select('id')
    .eq('room_id', roomId)
    .eq('status', 'pending')
    .order('created_at')
    .limit(1);
  if (oldest.error) throw oldest.error;
  if (!oldest.data.length) return null;   // やることがない

  const claimed = await admin
    .from('analysis_jobs')
    .update({ status: 'running', locked_at: now.toISOString() })
    .eq('id', oldest.data[0].id)
    .eq('status', 'pending')               // 他の処理が先につかんでいたら 0 件になる
    .select();
  if (claimed.error) {
    if (claimed.error.code === UNIQUE_VIOLATION) return null;   // 他の処理が running 中
    throw claimed.error;
  }
  return claimed.data[0] ?? null;
}

//入力の材料をDBから集める
async function loadContext(job: Job): Promise<InputContext> {
  const toMsg = async (messageId: string) => {
    const { data, error } = await admin
      .from('messages')
      .select('id, body, member_id, members!messages_member_id_fkey(nickname)')
      .eq('id', messageId)
      .single();
    if (error) throw error;
    return { id: data.id, authorId: data.member_id, author: data.members?.nickname ?? '?', body: data.body };
  };

  const message = await toMsg(job.message_id);

  const { data: row, error } = await admin.from('messages').select('reply_to').eq('id', job.message_id).single();
  if (error) throw error;
  if (!row.reply_to) return { message };

  // 返信先が付箋（案・問題点）ならreplyTarget を添える
  const { data: target } = await admin
    .from('notes')
    .select('id, kind')
    .eq('source_message_id', row.reply_to)
    .in('kind', ['idea', 'problem'])
    .maybeSingle();

  return {
    message,
    replyTo: await toMsg(row.reply_to),
    replyTarget: target ? { noteId: target.id, kind: target.kind as 'idea' | 'problem' } : undefined,
  };
}

//ジョブ1件を処理
async function processJob(job: Job): Promise<void> {
  try {
    const { state, idMap } = await loadState(job.room_id);
    const ctx = await loadContext(job);
    const input = buildInput(job, ctx, idMap);
    const action = await analyze(state, input);
    const draft = toNoteDraft(action, input, idMap);
    if (draft) await persistDiff(job.room_id, draft);

    await admin.from('analysis_jobs').update({ status: 'done' }).eq('id', job.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    console.error('分析に失敗', job.id, message);
    await admin.from('analysis_jobs').update({ status: 'failed', error: message }).eq('id', job.id);
  }
}

// 部屋にrunningがあれば何もしない（ANALYSIS_LOCK_TIMEOUT_MS を超えていれば奪う）。
// なければ最古のpendingを処理し、次の pending があれば繰り返す
export async function runNextJob(roomId: string): Promise<void> {
  for (;;) {
    const job = await claimJob(roomId);
    if (!job) return;
    await processJob(job);
  }
}

// 部屋のnotesを木に組み直し、短いID（i1, p1 …）を振る
export async function loadState(roomId: string): Promise<{ state: BoardState; idMap: IdMap }> {
  const [room, notes] = await Promise.all([
    admin.from('rooms').select('topic').eq('id', roomId).single(),
    admin.from('notes').select('*').eq('room_id', roomId),
  ]);
  if (room.error) throw room.error;
  if (notes.error) throw notes.error;
  return buildState(room.data.topic, notes.data);
}

// 案ならembedとplaceIdeaで座標を決めてnotesにinsertする。
// 一意制約違反（23505）なら何もせず null
export async function persistDiff(roomId: string, draft: NoteDraft): Promise<Note | null> {
  let placement: { x: number | null; y: number | null; embedding: string | null } = {
    x: null,
    y: null,
    embedding: null,
  };
  let newScale: number | null = null;

  if (draft.kind === 'idea') {
    const [room, ideas, vector] = await Promise.all([
      admin.from('rooms').select('board_scale').eq('id', roomId).single(),
      admin.from('notes').select('x, y, embedding').eq('room_id', roomId).eq('kind', 'idea'),
      embed(draft.label),
    ]);
    if (room.error) throw room.error;
    if (ideas.error) throw ideas.error;

    // pgvector は文字列 "[0.1,0.2,…]" でやりとりされる
    const existing = ideas.data.map((n) => ({
      x: n.x ?? 0,
      y: n.y ?? 0,
      embedding: n.embedding ? (JSON.parse(n.embedding) as number[]) : [],
    }));
    const placed = placeIdea(existing, vector, room.data.board_scale);
    placement = { x: placed.x, y: placed.y, embedding: JSON.stringify(vector) };
    if (placed.scale !== room.data.board_scale) newScale = placed.scale;
  }

  const { data, error } = await admin
    .from('notes')
    .insert({
      room_id: roomId,
      source_message_id: draft.sourceMessageId,
      kind: draft.kind,
      parent_id: draft.parentId,
      label: draft.label,
      proposer_id: draft.proposerId,
      ...placement,
    })
    .select()
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return null;   // この発言の付箋はもうある
    throw error;
  }

  // 付箋を入れてから倍率を上げる（逆だと、付箋が増えないまま拡大だけ起きることがある）
  if (newScale !== null) {
    await admin.from('rooms').update({ board_scale: newScale }).eq('id', roomId);
  }
  return data;
}
