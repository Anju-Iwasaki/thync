// actionの解釈 担当：岩崎
// 本番（persistDiff）とテスト（applyDiff）で同じ toNoteDraft を通す
import type { AnalysisAction, AnalysisInput, NoteDraft } from '@/types/diff';
import type { BoardState, IdMap } from '@/types/state';

// actionを作るnote1つに変換する。noneならnull
export function toNoteDraft(
  action: AnalysisAction,
  input: AnalysisInput,
  idMap: IdMap
): NoteDraft | null {
  const base = { proposerId: input.message.authorId, sourceMessageId: input.message.id };
  const parent = (short: string) => {
    const id = idMap[short];
    // validateActionが弾いているはず。ここに来たら検査の漏れ
    if (!id) throw new Error(`存在しない親ID: ${short}`);
    return id;
  };

  switch (action.op) {
    case 'none':
      return null;
    case 'create_idea':
      return { ...base, kind: 'idea', parentId: null, label: action.label };
    case 'add_reason':
      return { ...base, kind: 'reason', parentId: parent(action.ideaId), label: action.label };
    case 'add_problem':
      return { ...base, kind: 'problem', parentId: parent(action.ideaId), label: action.label };
    case 'add_solution':
      return { ...base, kind: 'solution', parentId: parent(action.problemId), label: action.label };
  }
}

// テスト用。DBを使わず、stateにdraft を足した新しいstateを返す。
// replay では idMap を恒等（{ i1: 'i1' }）にするので、draft.parentId は短いIDになる。
// 新しい付箋の短いIDは buildState と同じ規則（種類ごとの作成順）で振る
export function applyDiff(state: BoardState, draft: NoteDraft): BoardState {
  const s: BoardState = structuredClone(state);
  const all = {
    i: s.ideas,
    p: s.ideas.flatMap((i) => i.problems),
    s: s.ideas.flatMap((i) => i.problems.flatMap((p) => p.solutions)),
    r: s.ideas.flatMap((i) => i.reasons),
  };
  const nextId = (prefix: keyof typeof all) => `${prefix}${all[prefix].length + 1}`;
  const idea = () => s.ideas.find((i) => i.id === draft.parentId);
  const problem = () => s.ideas.flatMap((i) => i.problems).find((p) => p.id === draft.parentId);
  const missing = () => new Error(`親が見つからない: ${draft.parentId}`);

  switch (draft.kind) {
    case 'idea':
      s.ideas.push({ id: nextId('i'), label: draft.label, reasons: [], problems: [] });
      break;
    case 'reason': {
      const parent = idea();
      if (!parent) throw missing();
      parent.reasons.push({ id: nextId('r'), label: draft.label });
      break;
    }
    case 'problem': {
      const parent = idea();
      if (!parent) throw missing();
      parent.problems.push({ id: nextId('p'), label: draft.label, solutions: [] });
      break;
    }
    case 'solution': {
      const parent = problem();
      if (!parent) throw missing();
      parent.solutions.push({ id: nextId('s'), label: draft.label });
      break;
    }
  }
  return s;
}
