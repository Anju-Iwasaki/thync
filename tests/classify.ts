// 発言単体の分類テスト（仕様書 §8①）
// 空の状態で1発言を判定する
import { callGemini } from "../src/lib/llm/client";
import * as fs from "fs";
import * as path from "path";

export async function classifyMessage(body: string): Promise<'idea' | 'problem' | 'other'> {
  // throw new Error('未実装: classifyMessage');
  const prompt = `
    あなたはチャットの発言分類AIです。
    以下のルールに従って、メッセージを「idea」「problem」「other」のいずれか1つに分類し、JSONで出力してください。

    【分類ルール】
    - "idea": 議題に対する新しい案、選択肢、具体的な解決策の提案（例：「〜はどう？」「〜しようよ」など）。
      ※問題点を指摘しつつ解決策を出している場合も "idea" を優先。
    - "problem": 課題、懸念、リスク、デメリット、制約の指摘（例：「〜そう」「〜大変じゃない？」「〜高くなりそう」など）。
    - "other": 提案や問題提起に含まれない、賛否・感情表現・相槌・質問・雑談など（例：「いいね！」「お腹すいた」「何時集合？」など）。

    【メッセージ】
    "${body}"

    【出力フォーマット】
    {"label": "idea" | "problem" | "other"}
  `;

  try {
    const raw = await callGemini(prompt, {
      responseSchema: {
        type: "OBJECT",
        properties: {
          label: {
            type: "STRING",
            enum: ["idea", "problem", "other"],
          },
        },
        required: ["label"],
      },
    });

    const parsed = JSON.parse(raw);
    if (parsed.label === "idea" || parsed.label === "problem" || parsed.label === "other") {
      return parsed.label;
    }
    return "other";
  } catch (err) {
    console.error("分類エラー:", err);
    return "other";
  }
}

// テスト実行用スクリプト（例文データセットで正答率を計測）
async function runEvaluation() {
  const fixturePath = path.join(__dirname, "fixtures", "classify.json");
  const rawText = fs.readFileSync(fixturePath, "utf-8");

  // fixtures/classify.json 内の配列部分を取り出す
  const jsonMatch = rawText.match(/data\s*=\s*(\[[\s\S]*?\])/);
  if (!jsonMatch) {
    throw new Error("テストデータの読み込みに失敗しました");
  }

  const items: Array<{ id: number; text: string; label: string }> = JSON.parse(
    jsonMatch[1].replace(/,\s*([\]}])/g, "$1")
  );

  const labelMap: Record<string, "idea" | "problem" | "other"> = {
    発案: "idea",
    問題提起: "problem",
    それ以外: "other",
  };

  console.log(`\n========================================`);
  console.log(` 分類テスト開始 (全 ${items.length} 件)`);
  console.log(`========================================\n`);

  let correctCount = 0;

  for (const item of items) {
    const expected = labelMap[item.label] || "other";
    const actual = await classifyMessage(item.text);
    const isCorrect = expected === actual;

    if (isCorrect) {
      correctCount++;
      console.log(`[PASS] ID ${item.id}: "${item.text}" -> 期待: ${expected}, 結果: ${actual}`);
    } else {
      console.log(`[FAIL] ID ${item.id}: "${item.text}" -> 期待: ${expected}, 結果: ${actual} ❌`);
    }
  }

  const accuracy = ((correctCount / items.length) * 100).toFixed(1);
  console.log(`\n========================================`);
  console.log(` 正解数: ${correctCount} / ${items.length}`);
  console.log(` 正答率: ${accuracy}%`);
  console.log(`========================================\n`);
}

if (require.main === module) {
  runEvaluation().catch(console.error);
}
