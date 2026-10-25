import { z } from 'zod';

const Item = z.object({ id: z.string(), label: z.string() });

//座標・票数は含めない
export const BoardState = z.object({
  topic: z.string(),
  ideas: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      reasons: z.array(Item),
      problems: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          solutions: z.array(Item),
        })
      ),
    })
  ),
});
export type BoardState = z.infer<typeof BoardState>;

// 短いID→保存先のID
export type IdMap = Record<string, string>;