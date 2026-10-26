// AIへの入力を組み立て 担当：岩崎
import type { AnalysisInput, Msg } from '@/types/diff';
import type { IdMap } from '@/types/state';
import type { Job } from '@/types/rows';

// buildInputに渡す材料。runNextJobがDBから集めて渡す
export type InputContext = {
  message: Msg;
  replyTo?: Msg;                                           // 返信先の発言（全発言方式）
  replyTarget?: { noteId: string; kind: 'idea' | 'problem' }; // 返信先が付箋のとき（noteId はUUID）
};

export function buildInput(job: Job, ctx: InputContext, idMap: IdMap): AnalysisInput {
  throw new Error('未実装: buildInput');
}
