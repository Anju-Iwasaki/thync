// ジョブ処理とDBの読み書き 担当：岩崎
// DBを使うのはこのファイルだけ。テスト（replay）からは読み込まない
import 'server-only';
import type { BoardState, IdMap } from '@/types/state';
import type { NoteDraft } from '@/types/diff';
import type { Note } from '@/types/rows';

// 部屋に running があれば何もしない（ANALYSIS_LOCK_TIMEOUT_MS を超えていれば奪う）。
// なければ最古の pending を処理し、次の pending があれば繰り返す
export async function runNextJob(roomId: string): Promise<void> {
  throw new Error('未実装: runNextJob');
}

// 部屋の notes を木に組み直し、短いID（i1, p1 …）を振る。
// 番号は created_at 順で振る（applyDiff と同じ順番になるように）
export async function loadState(roomId: string): Promise<{ state: BoardState; idMap: IdMap }> {
  throw new Error('未実装: loadState');
}

// 案なら embed と placeIdea で座標を決めて notes に insert する。
// 一意制約違反（23505）なら何もせず null
export async function persistDiff(roomId: string, draft: NoteDraft): Promise<Note | null> {
  throw new Error('未実装: persistDiff');
}
