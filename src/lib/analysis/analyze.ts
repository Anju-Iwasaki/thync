// 分析本体
// テスト（replay）からも呼ばれるので、server-only は付けない
import { AnalysisAction as AnalysisActionSchema,} from "@/types/diff";
import type { AnalysisAction, AnalysisInput,} from "@/types/diff";
import type { BoardState } from "@/types/state";

import { LLM_RETRY } from "@/constants";
import { mockAnalyze } from "./mock";
import { reactionPrompt, replyPrompt, messagePrompt,} from "./prompts";
import { validateAction } from "./validate";
import { callGemini } from "@/lib/llm/client";

// プロンプトを選んで callGemini → zod で検証 → validateAction。
// どちらかで不正なら LLM_RETRY 回まで再試行し、それでも不正なら例外
export async function analyze(state: BoardState, input: AnalysisInput): Promise<AnalysisAction> {
  
  // 1. まず呼び出しログを出す（モックかどうかに関わらず呼ばれたことが分かる）
  // ─── 全発言（message）の起動時だけ目立つログを出す ───
  if (input.trigger === "message") {
    console.log("\n=======================================================");
    console.log("【全発言方式（message）が起動しました！】");
    console.log("発言者:", input.message.author);
    console.log("内容  :", input.message.body);
    console.log("返信先:", input.replyTo ? `${input.replyTo.author}: ${input.replyTo.body}` : "なし");
    console.log("=======================================================\n");
  } else {
    // リアクションやリプライの時は通常ログ
    console.log(`[DEBUG analyze] 起動しました! trigger: ${input.trigger}`);
  }
  
  // 2. モックモードならここで返す（1回だけにまとめる）
  if (process.env.USE_MOCK_LLM === 'true') {
    console.log('[DEBUG analyze] USE_MOCK_LLM が有効なため mockAnalyze を実行します');
    return mockAnalyze(input);
  }

  // 分析の種類に応じてプロンプトを作る
  let prompt: string;

  switch (input.trigger) {
    case "reaction":
      prompt = reactionPrompt(state, input);
      break;

    case "reply":
      prompt = replyPrompt(state, input);
      break;

    case "message":
      prompt = messagePrompt(state, input);
      break;
  }

  let lastError: unknown;

  // 初回 + 指定回数の再試行
  for (let attempt = 0; attempt <= LLM_RETRY; attempt++) {
    try {
      // Geminiに分析してもらう
      const response = await callGemini(prompt);
      console.log('[DEBUG Gemini応答]:', response); // Gemini起動確認
      console.log('[DEBUG analyze] 起動しました! trigger:', input.trigger);


      // JSON文字列をオブジェクトに変換
      const json = JSON.parse(response);

      // Zodで出力形式をチェック
      const parsed = AnalysisActionSchema.safeParse(json);

      if (!parsed.success) {
        throw new Error("AIの出力形式が不正です");
      }

      // THYNC固有のルールで検証
      const result = validateAction(parsed.data, input, state);
      if (!result.ok) {
        throw new Error(result.reason);
      }

      // 正常な分析結果を返す
      return result.action;

    } catch (error) {
      lastError = error;
    }
  }

  console.error(
    "[THYNC] Gemini分析の失敗原因:",
    lastError
  );

  throw new Error(
    "AI分析に失敗しました",
    { cause: lastError }
  );
}
