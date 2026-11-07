// AIの気づき
import type { BoardState } from '@/types/state';
import { callGemini } from '@/lib/llm/client';

export type Insight = { text: string; ideaIds: string[] };   // ideaIds は短いID

export async function generateInsights(state: BoardState): Promise<Insight[]> {
  // アイデアが2つ未満なら、関係性の分析ができないため空配列を返す
  if (!state.ideas || state.ideas.length < 2) {
    return [];
  }

  // ボードの現在の状態を要約テキストに変換
  const boardSummary = state.ideas.map((idea) => {
    const reasons = idea.reasons.map((r) => `    - 賛成理由: ${r.label}`).join('\n');
    const problems = idea.problems.map((p) => {
      const solutions = p.solutions.map((s) => `        * 解決策: ${s.label}`).join('\n');
      return `    - 問題点: ${p.label}\n${solutions}`;
    }).join('\n');

    return `アイデアID: "${idea.id}" (案: ${idea.label})\n${reasons}\n${problems}`;
  }).join('\n\n');

  const prompt = `
    【役割】
    あなたは対話の可能性を広げる、親しみやすく聡明なディスカッションパートナーAIです。
    現在のディスカッションボードを俯瞰し、参加者が見落としている「新しい視点」「会話に出ていないアイデア」「意外な組み合わせ」を提示して、メンバーの思考を広げる「気づき（Insight）」を抽出してください。

    【現在のボード情報】
    テーマ: ${state.topic || '未設定'}
    ${boardSummary}

    【気づきの生成ルール（重要）】
    1. 単なる「まとめ・要約」は禁止です:
       - すでに会話で出ている内容を言い換えるだけでなく、「会話ではまだ誰も言っていない新しい工夫や視点」を1つ付け足して提案してください。
    2. 分かりやすい日常の言葉（学生でも直感的に理解できる表現）:
       - 「蓄積性」「通知性」「段階移行」などの堅苦しいビジネス用語・漢語は使わないでください。
       - 「後から探しやすい」「すぐ気づける」「お試しで使ってみる」のような、自然で分かりやすい言葉を選んでください。
    3. 親しみやすい敬語（フランクかつ丁寧なトーン）:
       - タメ口は禁止ですが、堅苦しすぎる敬語も避けてください。
       - 「〜してみると良いかもしれませんね」「〜を組み合わせれば、〜も一緒に解決できそうですよ」のように、柔らかく前向きな敬語（です・ます調）で語りかけてください。

    【出力ルール】
    - 出力は厳密に以下のJSON配列形式のみにしてください。Markdown表記や解説文は禁止です。
    - 気づきは最大2〜3件までに絞り込んでください。
    - ideaIds には、関連するアイデアのIDを配列で指定してください（必ず【現在のボード情報】にある実在のIDを使用すること）。

    [
      {
        "text": "親しみやすい敬語での新しい視点や提案（60文字以内）",
        "ideaIds": ["関連するアイデアID1", "関連するアイデアID2"]
      }
    ]
  `;

  try {
    const response = await callGemini(prompt);
    const json = JSON.parse(response);

    if (Array.isArray(json)) {
      // 形式が一致しているものだけを安全に抽出
      return json
        .filter((item): item is Insight => 
          typeof item?.text === 'string' && 
          Array.isArray(item?.ideaIds) && 
          item.ideaIds.every((id: unknown) => typeof id === 'string')
        )
        .slice(0, 3);
    }
    return [];
  } catch (error) {
    console.error('[THYNC] generateInsights エラー:', error);
    // エラーが起きてもアプリの他機能を止めないよう安全に空配列を返す
    return [];
  }
}
