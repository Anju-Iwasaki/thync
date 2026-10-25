import { z } from 'zod';
import type { NoteKind } from './domain';

// AIへの入力
export type Msg = {
  id: string;
  authorId: string;   // members.id。LLMには送らない
  author: string;     // ニックネーム。LLMに送る
  body: string;
};

export type AnalysisInput =
  | { trigger: 'reaction'; message: Msg }
  | { trigger: 'reply'; message: Msg; target: { id: string; kind: 'idea' | 'problem' } }
  | { trigger: 'message'; message: Msg; replyTo?: Msg };

//AIの出力
const Label = z.string().trim().min(1);

export const AnalysisAction = z.discriminatedUnion('op', [
  z.object({ op: z.literal('create_idea'), label: Label }),
  z.object({ op: z.literal('add_reason'), ideaId: z.string(), label: Label }),
  z.object({ op: z.literal('add_problem'), ideaId: z.string(), label: Label }),
  z.object({ op: z.literal('add_solution'), problemId: z.string(), label: Label }),
  z.object({ op: z.literal('none') }),
]);
export type AnalysisAction = z.infer<typeof AnalysisAction>;

// 作るnote1つ（toNoteDraft の出力）
export type NoteDraft = {
  kind: NoteKind;
  parentId: string | null;   // 保存先のID（本番はUUID）
  label: string;
  proposerId: string;        // members.id
  sourceMessageId: string;   // messages.id
};