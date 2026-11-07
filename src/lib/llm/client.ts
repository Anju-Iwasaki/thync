// Gemini呼び出し
// テスト（replay）からも呼ばれるので、server-only は付けない
import { GoogleGenAI } from "@google/genai";

export type GeminiOptions = {
  responseSchema?: unknown;   //JSON出力の形
  maxOutputTokens?: number;
  timeoutMs?: number;
};

// 返り値はモデルが返したJSONの文字列。検証は呼び出し側（analyze）で行う
export async function callGemini(prompt: string, options: GeminiOptions = {}): Promise<string> {
  // throw new Error('未実装: callGemini');
  //GEMINI呼び出し
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が設定されていません");
  }

  const ai = new GoogleGenAI({ apiKey });

  const model =
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-3.5-flash-lite";

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      ...(options.responseSchema !== undefined
        ? { responseSchema: options.responseSchema }
        : {}),
      httpOptions: {
        timeout: options.timeoutMs ?? 25000,
      },
    },
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error(
      `Geminiの応答が空です（model: ${model}）`
    );
  }

  return text;
}
