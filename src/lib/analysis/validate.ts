// 出力の検査　担当：楠奥
import type { AnalysisAction, AnalysisInput } from '@/types/diff';
import type { BoardState } from '@/types/state';

export type ValidateResult =
  | { ok: true; action: AnalysisAction }
  | { ok: false; reason: string };   //reasonはログと再試行の判断に使う

// 許されないopを弾く／返信なら親を返信先で上書き／存在しないIDを弾く／
// 長すぎるラベルをMAX_LABEL_LENGTHで詰める
export function validateAction(
  action: AnalysisAction,
  input: AnalysisInput,
  state: BoardState
): ValidateResult {
  // 未実装の間は適当に流す
  return { ok: true, action };
}
