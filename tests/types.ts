// 会話ログの形式  大谷はこの形で tests/fixtures/logs/*.json を書く
import { z } from 'zod';

export const ConversationLog = z.object({
  topic: z.string(),
  messages: z.array(
    z.object({
      id: z.string(),                       // 'm1', 'm2' …
      author: z.string(),                   // ニックネーム
      body: z.string(),
      replyTo: z.string().optional(),       // 返信先の id
      reactions: z
        .array(z.object({ by: z.string(), value: z.enum(['pro', 'con']) }))
        .optional(),                        // この発言に押された賛否（押した順）
    })
  ),
  checkpoints: z.array(
    z.object({
      after: z.string(),                    // この発言を処理したあとに確認する
      kind: z.enum(['idea', 'problem', 'solution', 'reason']),
      labelIncludes: z.string(),            // 付箋のラベルに含まれる語
      parentLabelIncludes: z.string().optional(), // 親の付箋のラベルに含まれる語
    })
  ),
});
export type ConversationLog = z.infer<typeof ConversationLog>;

// 分類テストの例文の形式  大谷・森はこの形で tests/fixtures/classify.json を書く
const ClassLabel = z.enum(['idea', 'problem', 'other']);
const MaybeLabel = z.union([ClassLabel, z.literal('')]);   // まだ付けていなければ ""

export const ClassifyItem = z.object({
  id: z.string(),            // 'c01', 'c02' …
  body: z.string().min(1),
  otani: MaybeLabel,
  mori: MaybeLabel,
  answer: MaybeLabel,        // 2人で決めた正解。正解率はこれで測る
});
export const ClassifyFile = z.array(ClassifyItem);
export type ClassifyItem = z.infer<typeof ClassifyItem>;
