// AIへの入力を組み立てる 担当：岩崎
import type { AnalysisInput, Msg } from '@/types/diff';
import type { IdMap } from '@/types/state';
import type { Job } from '@/types/rows';

// buildInputに渡す材料。runNextJob がDBから集めて渡す
export type InputContext = {
  message: Msg;
  replyTo?: Msg;                                              // 返信先の発言（全発言方式）
  replyTarget?: { noteId: string; kind: 'idea' | 'problem' }; // 返信先が付箋のとき（noteId はUUID）
};

export function buildInput(job: Job, ctx: InputContext, idMap: IdMap): AnalysisInput {
  switch (job.trigger) {
    case 'reaction':
      return { trigger: 'reaction', message: ctx.message };

    case 'reply': {
      const t = ctx.replyTarget;
      if (!t) throw new Error('reply なのに返信先の付箋がない');
      // UUID → 短いID（LLMには短いIDしか見せない）
      const short = Object.keys(idMap).find((k) => idMap[k] === t.noteId);
      if (!short) throw new Error('返信先の付箋が状態にない');
      return { trigger: 'reply', message: ctx.message, target: { id: short, kind: t.kind } };
    }

    case 'message':
      return { trigger: 'message', message: ctx.message, replyTo: ctx.replyTo };

    default:
      throw new Error(`知らない trigger: ${job.trigger}`);
  }
}
