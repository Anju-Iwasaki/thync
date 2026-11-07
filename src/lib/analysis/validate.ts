// 出力の検査
import type { AnalysisAction, AnalysisInput } from '@/types/diff';
import type { BoardState } from '@/types/state';
import { MAX_LABEL_LENGTH } from "@/constants";

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
  // return { ok: true, action };

  // 分析不要という判断は、どの方式でも許可する
  if (action.op === "none") {
    return { ok: true, action };
  }

  // ラベルの前後の空白を取り除き、最大文字数を制限
  const label = Array.from(action.label.trim()).slice(0, MAX_LABEL_LENGTH).join("").trim();

  if (!label) {
    return { ok: false, reason: "ラベルが空です",};
  }

  // アイデアIDが存在するか確認
  const ideaExists = (id: string): boolean =>
    state.ideas.some((idea) => idea.id === id);

  // 問題点IDが存在するか確認
  const problemExists = (id: string): boolean =>
    state.ideas.some((idea) =>
      idea.problems.some((problem) => problem.id === id)
    );

  // リアクション起点
  if (input.trigger === "reaction") {

    // 新しいアイデアの作成だけ許可
    if (action.op !== "create_idea") {
      return { ok: false, reason: "リアクションではアイデア作成のみ可能です",};
    }

    return { ok: true, action: { op: "create_idea", label,},};
  }

  // 返信起点
  if (input.trigger === "reply") {
    const target = input.target;

    // アイデアへの返信
    if (target.kind === "idea") {
      if (!ideaExists(target.id)) {
        return { ok: false, reason: "返信先のアイデアが存在しません",};
      }

      if (action.op !== "add_reason" && action.op !== "add_problem") {
        return { ok: false, reason: "アイデアへの返信では理由・問題点のみ追加可能です",};
      }

      // GeminiのideaIdではなく実際の返信先を使う
      return { ok: true, action: { op: action.op, ideaId: target.id, label,},};
    }

    // 問題点への返信
    if (target.kind === "problem") {
      if (!problemExists(target.id)) {
        return { ok: false, reason: "返信先の問題点が存在しません",};
      }

      if (action.op !== "add_solution") {
        return { ok: false, reason: "問題点への返信では解決策のみ追加可能です",};
      }

      // GeminiのproblemIdではなく実際の返信先を使う
      return { ok: true, action: { op: "add_solution", problemId: target.id, label,},};
    }
  }

  // 全発言方式は現段階で対象外
  // return { ok: false, reason: "現在対応していない分析形式です",};
  // 全発言方式（message起点）
  if (input.trigger === "message") {
    switch (action.op) {
      case "create_idea":
        return { ok: true, action: { op: "create_idea", label } };

      case "add_reason": {
        const ideaId = action.ideaId.trim();
        if (!ideaExists(ideaId)) {
          return { ok: false, reason: `指定されたアイデア(${ideaId})が存在しません` };
        }
        return { ok: true, action: { op: "add_reason", ideaId, label } };
      }

      case "add_problem": {
        const ideaId = action.ideaId.trim();
        if (!ideaExists(ideaId)) {
          return { ok: false, reason: `指定されたアイデア(${ideaId})が存在しません` };
        }
        return { ok: true, action: { op: "add_problem", ideaId, label } };
      }

      case "add_solution": {
        const problemId = action.problemId.trim();
        if (!problemExists(problemId)) {
          return { ok: false, reason: `指定された問題点(${problemId})が存在しません` };
        }
        return { ok: true, action: { op: "add_solution", problemId, label } };
      }

      default:
        return { ok: false, reason: "不正なアクション形式です" };
    }
  }

  return { ok: false, reason: "不正なアクション形式です",};
}
