// actionの解釈　担当：岩崎
// 本番（persistDiff）とテスト（applyDiff）で同じ toNoteDraft を通す
import type { AnalysisAction, AnalysisInput, NoteDraft } from '@/types/diff';
import type { BoardState, IdMap } from '@/types/state';

// action を作るnote1つに変換する。noneならnull
export function toNoteDraft(
  action: AnalysisAction,
  input: AnalysisInput,
  idMap: IdMap
): NoteDraft | null {
  throw new Error('未実装: toNoteDraft');
}

// テスト用。DBを使わず、stateにdraftを足した新しいstateを返す。
// replayではidMapを恒等（{ i1: 'i1' }）にするので、draft.parentId は短いIDになる
export function applyDiff(state: BoardState, draft: NoteDraft): BoardState {
  throw new Error('未実装: applyDiff');
}
