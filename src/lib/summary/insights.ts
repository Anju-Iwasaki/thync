// AIの気づき　担当：楠奥。時間がなければ切ってOK
import type { BoardState } from '@/types/state';

export type Insight = { text: string; ideaIds: string[] };   // ideaIds は短いID

export async function generateInsights(state: BoardState): Promise<Insight[]> {
  return [];
}
