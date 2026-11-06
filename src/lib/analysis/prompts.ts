// プロンプト  担当：楠奥（messagePrompt は岩崎と共同）
import type { AnalysisInput } from '@/types/diff';
import type { BoardState } from '@/types/state';

// reaction トリガー：create_idea / none
export function reactionPrompt(state: BoardState, input: Extract<AnalysisInput, { trigger: 'reaction' }>): string {
  // throw new Error('未実装: reactionPrompt');
  const { author, body } = input.message;

  return `
    【役割】
    あなたは議論整理のファシリテーターAIです。
    参加者の発言に賛否リアクションが押されました。この発言が「新しい案として付箋を作成すべき提案」か、それとも「案ではない会話」かを判定してください。

    【判定基準】
    - create_idea: 議論に対する具体的な新しい提案、機能案、改善方針など、単独の付箋として扱うべき発言。
    - none: 単なる同意・感想、質問、挨拶、または独立した提案を含まない雑談。

    【出力フォーマット】
    厳密にJSONのみを出力してください。
    新規の案の場合:
    {"op": "create_idea", "label": "案の簡潔な要約（体言止め、30文字以内）"}

    案ではない場合:
    {"op": "none"}

    【例】
    発言: 「音声入力機能を追加したら移動中でも使いやすそう」
    出力: {"op": "create_idea", "label": "音声入力機能の追加"}

    発言: 「それめちゃくちゃ良いですね！」
    出力: {"op": "none"}

    【対象の発言】
    発言者: ${author}
    内容: 
    ${body}
  `;
}

// reply トリガー：add_reason / add_problem / add_solution / none
export function replyPrompt(state: BoardState, input: Extract<AnalysisInput, { trigger: 'reply' }>): string {
  // throw new Error('未実装: replyPrompt');
  const { author, body } = input.message;
  const target = input.target;
  const targetType = target.kind === 'idea' ? '案' : '問題点';

  return `
    【役割】
    あなたは議論整理の、少しルーズなファシリテーターAIです。
    既存の付箋に対する返信発言を分析し、「賛成理由」「問題点」「解決案」「その他」の4分類を行ってください。

    【返信先付箋の情報】
    対象ID: ${target.id}
    対象の種類: ${targetType}

    【出力ルールと制約】
    返信先の種類（${targetType}）に応じて、該当するJSONを1つだけ出力してください。
    ※ ideaId や problemId には、上記【返信先付箋の情報】にある「対象ID（${target.id}）」をそのまま指定してください。

    1. 返信先が「案」の場合（※解決案は選べません）:
    - 賛成理由・メリット・裏付けを述べている:
      ※ 単なる賛成・肯定（「いいね！」「賛成」「それ最高」など、具体的な理由を言っていないもの）はこれに含めず、必ず "none" にしてください。
      {"op": "add_reason", "ideaId": "${target.id}", "label": "賛成理由の要約（体言止め、30文字以内）"}
    - 懸念点・反対理由・問題点・デメリットを述べている:
      ※ 単なる拒絶・反対（「なしでしょ！」「嫌だ」「反対」「やめて」など、具体的な理由・根拠を言っていないもの）はこれに含めず、必ず "none" にしてください。
      ※ 「寒そう」「費用が高い」「難しそう」など、具体的な懸念や理由がある場合のみ分類してください。
      {"op": "add_problem", "ideaId": "${target.id}", "label": "問題点の要約（体言止め、30文字以内）"}
    - 単なる相づち、理由のない賛否、関係のない発言:
      {"op": "none"}

    2. 返信先が「問題点」の場合:
    - その問題に対する解決案を提案している:
      {"op": "add_solution", "problemId": "${target.id}", "label": "解決案の要約（体言止め、30文字以内）"}
    - 単なる同意や関係のない発言:
      {"op": "none"}

    【例】
    対象IDが「i1」の案への返信「サーバー代が浮くのが魅力だな」:
    {"op": "add_reason", "ideaId": "i1", "label": "サーバー費用の削減効果"}

    対象IDが「i1」の案への返信「いいねそれ！」「賛成！」:
    {"op": "none"}

    対象IDが「i1」の案への返信「なしでしょ！」「嫌だな」:
    {"op": "none"}

    対象IDが「i2」の案への返信「オフライン環境だと動かないリスクがあるよね」:
    {"op": "add_problem", "ideaId": "i2", "label": "オフライン時の動作制限"}

    対象IDが「p1」の問題点への返信「ローカルキャッシュを使えば解決できます」:
    {"op": "add_solution", "problemId": "p1", "label": "ローカルキャッシュによる対策"}

    対象IDが「p1」の問題点への返信「確かにそれは困るね」:
    {"op": "none"}

    【対象の返信発言】
    発言者: ${author}
    内容: 
    ${body}
  `;
}

// message トリガー（全発言方式）：すべてのop
export function messagePrompt(state: BoardState, input: Extract<AnalysisInput, { trigger: 'message' }>): string {
  // throw new Error('未実装: messagePrompt');
  const { author, body } = input.message;
  const replyContext = input.replyTo
    ? `直前の発言（${input.replyTo.author}）: ${input.replyTo.body}` : 'なし';

  // 既存のID一覧をGeminiに明確に提示して捏造を防ぐ
  const existingIdeas = state.ideas.map(i => `- アイデアID: "${i.id}" (内容: ${i.label})`).join('\n');
  const existingProblems = state.ideas.flatMap(i => 
    i.problems.map(p => `- 問題点ID: "${p.id}" (親アイデア: ${i.label}, 問題内容: ${p.label})`)
  ).join('\n');

  return `
    【役割】
    あなたはブレインストーミングや議論を構造化・整理するファシリテーターです。
    チャットに新しい発言が投稿されました。現在のボード情報と発言内容を分析し、最も適切な操作（op）を1つ選択してJSONを出力してください。

    【現在の登録済みアイデア一覧】
    ${existingIdeas || '（まだアイデアはありません）'}

    【現在の登録済み問題点一覧】
    ${existingProblems || '（まだ問題点はありません）'}

    【文脈情報】
    ${replyContext}

    【文脈と参照先の読み取りルール】
    1. 【文脈情報】に「直前の発言」がある場合（返信・リプライ時）:
       - 対象の発言先が明確です。直前の発言やその発言が属する案・課題を最優先の対象として判定してください。
    2. 【文脈情報】が「なし」の場合:
       - 現在のボード一覧から文脈上どの案・問題点に言及しているかを推測してください。
       - もし「どの案に対する発言なのか確信が持てない・曖昧」な場合は、無理に関連付けず "none" を選んでください。

    【判定基準と出力フォーマット】
    以下のいずれか1つのJSONのみを出力してください。解説文は禁止です。
    ※ ideaId や problemId には、上記一覧に実在するIDの文字列を完全一致で指定してください。架空のIDを作ってはいけません。

    1. 既存の案に属さない「全く新しいアイデア・提案」の場合:
    {"op": "create_idea", "label": "アイデアの要約（体言止め、30文字以内）"}

    2. 既存の案に対する「具体的な賛成理由・メリット・裏付け」の場合:
    ※ 単なる賛成・肯定（「いいね！」「賛成」「それ最高」など、具体的な理由を言っていないもの）はこれに含めず、必ず 5. none にしてください。
    {"op": "add_reason", "ideaId": "既存のアイデアID", "label": "理由の要約（体言止め、30文字以内）"}

    3. 既存の案に対する「具体的な懸念・リスク・問題点・デメリット」の場合:
    ※ 重要: 単なる拒絶・反対（「なしでしょ！」「嫌だ」「反対」「やめて」など、具体的な理由・根拠を言っていないもの）はこれに含めず、必ず 5. none にしてください。
    ※ 「費用が高すぎる」「治安が心配」「休みが取れそうにない」のように、具体的な理由や懸念の中身がある場合のみ分類してください。
    {"op": "add_problem", "ideaId": "対象のアイデアID", "label": "問題点・懸念の要約（体言止め、30文字以内）"}

    4. 既存の問題点一覧にある問題に対する「克服・解消・対策・解決する手段」の場合:
    {"op": "add_solution", "problemId": "対象の問題点ID", "label": "解決案の要約（体言止め、30文字以内）"}

    5. 上記のいずれにも該当しない場合:
    ※ 挨拶、単なる相づち、感想、事実連絡、質問のほか、具体的な理由のない「単なる賛成」「単なる反対・拒否」もすべてここに含まれます。
    {"op": "none"}

    【例】
    発言: 「音声入力機能をつけるのはどう？」
    出力: {"op": "create_idea", "label": "音声入力機能の追加"}

    既存の案i1に対して「開発コストが安く抑えられるのが良い」:
    出力: {"op": "add_reason", "ideaId": "i1", "label": "開発コストの低減"}

    既存の案i1に対して「いいねそれ！」「確かに賛成！」:
    出力: {"op": "none"}

    既存の案i1に対して「海外はなしでしょ！」「反対！」「それは嫌だな」:
    出力: {"op": "none"}

    既存の案i1に対して「パスポート持ってない人が多いから大変そう」「費用が高すぎて予算オーバーになる」:
    出力: {"op": "add_problem", "ideaId": "i1", "label": "旅券未所持や費用高騰の懸念"}

    既存の問題点p1に対して「知り合いのお店にお願いすれば席を開けてもらえる」:
    出力: {"op": "add_solution", "problemId": "p1", "label": "知人店舗への座席確保依頼"}

    発言: 「了解です！」「了解」「よろしく」
    出力: {"op": "none"}

    【対象の発言】
    発言者: ${author}
    内容: 
    ${body}
  `;
}
