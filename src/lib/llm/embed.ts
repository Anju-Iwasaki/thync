// ラベルのベクトル化  担当：楠奥
import { GoogleGenAI } from "@google/genai";

// 未実装の間は、配置が動くように固定長のダミーを返す
export async function embed(label: string): Promise<number[]> {
  // return Array.from({ length: 8 }, (_, i) => ((label.charCodeAt(i % label.length) || 0) % 7) / 7);
  // モック時はGemini APIを呼ばない
  if (process.env.USE_MOCK_LLM === "true") {
    return Array.from(
      { length: 8 },
      (_, i) =>
        ((label.charCodeAt(i % label.length) || 0) % 7) / 7
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が設定されていません");
  }

  const dimensions = Number(
    process.env.GEMINI_EMBEDDING_DIMENSIONS ?? "768"
  );

  if (
    !Number.isInteger(dimensions) ||
    dimensions < 128 ||
    dimensions > 3072
  ) {
    throw new Error(
      "GEMINI_EMBEDDING_DIMENSIONS が不正です"
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const model =
    process.env.GEMINI_EMBEDDING_MODEL?.trim() ||
    "gemini-embedding-2";

  const response = await ai.models.embedContent({
    model,
    contents: label,
    config: {
      outputDimensionality: dimensions,
    },
  });

  const values = response.embeddings?.[0]?.values;

  if (!values || values.length !== dimensions) {
    throw new Error(
      `埋め込み生成に失敗しました（model: ${model}）`
    );
  }

  return values;
}
