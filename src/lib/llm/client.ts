// Gemini呼び出し  担当：楠奥（星座日記から移植）
// テスト（replay）からも呼ばれるので、server-only は付けない

export type GeminiOptions = {
  responseSchema?: unknown;   //JSON出力の形
  maxOutputTokens?: number;
  timeoutMs?: number;
};

// 返り値はモデルが返したJSONの文字列。検証は呼び出し側（analyze）で行う
export async function callGemini(prompt: string, options: GeminiOptions = {}): Promise<string> {
  throw new Error('未実装: callGemini');
}
