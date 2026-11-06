// 出力の検査  担当：岩崎
// AIの出力が、形は正しいが、この場面では使えないものを弾く。形の検査（zod）は analyze が先に行う
import { MAX_LABEL_LENGTH } from '@/constants';
import type { AnalysisAction, AnalysisInput } from '@/types/diff';
import type { BoardState } from '@/types/state';

export type ValidateResult =
  | { ok: true; action: AnalysisAction }
  | { ok: false; reason: string };   // reason は再試行のときAIに伝え、失敗時はログに残る

// トリガーごとに許すop
const ALLOWED: Record<AnalysisInput['trigger'], AnalysisAction['op'][]> = {
  reaction: ['create_idea', 'none'],
  reply: ['add_reason', 'add_problem', 'add_solution', 'none'],
  message: ['create_idea', 'add_reason', 'add_problem', 'add_solution', 'none'],
};

// 文字数で切り詰める（絵文字なども1文字として数える）
function truncate(label: string): string {
  const chars = Array.from(label.trim());
  return chars.length > MAX_LABEL_LENGTH ? chars.slice(0, MAX_LABEL_LENGTH).join('') : chars.join('');
}

export function validateAction(
  action: AnalysisAction,
  input: AnalysisInput,
  state: BoardState
): ValidateResult {
  //このトリガーで許されたopか
  if (!ALLOWED[input.trigger].includes(action.op)) {
    return { ok: false, reason: `${input.trigger} では ${action.op} は使えない（使えるのは ${ALLOWED[input.trigger].join(' / ')}）` };
  }
  if (action.op === 'none') return { ok: true, action };

  //返信なら、親は返信先で確定する。AIが出した親IDは使わない
  if (input.trigger === 'reply') {
    const t = input.target;
    if (action.op === 'add_solution') {
      if (t.kind !== 'problem') return { ok: false, reason: '解決案（add_solution）は問題点への返信にだけ使える' };
      return { ok: true, action: { ...action, problemId: t.id, label: truncate(action.label) } };
    }
    if (action.op === 'add_reason' || action.op === 'add_problem') {
      if (t.kind !== 'idea') return { ok: false, reason: `問題点への返信では ${action.op} は使えない（add_solution か none）` };
      return { ok: true, action: { ...action, ideaId: t.id, label: truncate(action.label) } };
    }
  }

  //親IDが状態に存在するか（全発言方式ではAIが親を選ぶ）
  const ideaIds = new Set(state.ideas.map((i) => i.id));
  const problemIds = new Set(state.ideas.flatMap((i) => i.problems.map((p) => p.id)));
  if ((action.op === 'add_reason' || action.op === 'add_problem') && !ideaIds.has(action.ideaId)) {
    return { ok: false, reason: `案 ${action.ideaId} は存在しない（ある案：${[...ideaIds].join(', ') || 'なし'}）` };
  }
  if (action.op === 'add_solution' && !problemIds.has(action.problemId)) {
    return { ok: false, reason: `問題点 ${action.problemId} は存在しない（ある問題点：${[...problemIds].join(', ') || 'なし'}）` };
  }

  //ラベルを切り詰める
  return { ok: true, action: { ...action, label: truncate(action.label) } };
}
