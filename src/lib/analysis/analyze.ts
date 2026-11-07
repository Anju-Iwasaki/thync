// 分析本体　担当：岩崎（プロンプトと Gemini 接続は楠奥）
// テスト（replay）からも呼ばれるので、server-onlyは付けない
import { LLM_RETRY } from '@/constants';
import { callGemini } from '@/lib/llm/client';
import { AnalysisAction } from '@/types/diff';
import type { AnalysisInput } from '@/types/diff';
import type { BoardState } from '@/types/state';
import { mockAnalyze } from './mock';
import { reactionPrompt, replyPrompt, messagePrompt } from './prompts';
import { validateAction } from './validate';

function buildPrompt(state: BoardState, input: AnalysisInput): string {
  switch (input.trigger) {
    case 'reaction':
      return reactionPrompt(state, input);
    case 'reply':
      return replyPrompt(state, input);
    case 'message':
      return messagePrompt(state, input);
  }
}

// AIの返した文字列を、使える AnalysisAction にする。だめなら理由を返す
function check(raw: string, state: BoardState, input: AnalysisInput): { ok: true; action: AnalysisAction } | { ok: false; reason: string } {
  let json: unknown;
  try {
    // ```json … ``` で包まれて返ることがあるので外す
    json = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    return { ok: false, reason: 'JSONとして読めない' };
  }
  const parsed = AnalysisAction.safeParse(json);
  if (!parsed.success) {
    return { ok: false, reason: `形式が違う：${parsed.error.issues.map((i) => `${i.path.join('.') || 'op'} ${i.message}`).join('、')}` };
  }
  return validateAction(parsed.data, input, state);
}

// プロンプトを選んで callGemini → JSON → zod → validateAction。
// 不正なら理由を添えてLLM_RETRY回まで聞き直し、それでもだめなら例外（ジョブは failed になる）
export async function analyze(state: BoardState, input: AnalysisInput): Promise<AnalysisAction> {
  if (process.env.USE_MOCK_LLM === 'true') {
    // モックも本番と同じ検査を通す（検査の漏れにモックで気づけるように）
    const r = validateAction(mockAnalyze(input), input, state);
    if (!r.ok) throw new Error(`モックの出力が不正：${r.reason}`);
    return r.action;
  }

  const prompt = buildPrompt(state, input);
  let reason = '';
  for (let attempt = 0; attempt <= LLM_RETRY; attempt++) {
    const p = attempt === 0 ? prompt : `${prompt}\n\n前回の出力は次の理由で使えませんでした：${reason}\n指定の形式で出力し直してください。`;
    let raw: string;
    try {
      raw = await callGemini(p);
    } catch (e) {
      reason = `Gemini の呼び出しに失敗：${e instanceof Error ? e.message : String(e)}`;
      continue;
    }
    const r = check(raw, state, input);
    if (r.ok) return r.action;
    reason = r.reason;
  }
  throw new Error(`AIの出力が使えない（${LLM_RETRY + 1}回）：${reason}`);
}
