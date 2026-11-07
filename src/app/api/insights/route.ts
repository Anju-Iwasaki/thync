// AIの気づきの受付  担当：岩崎（中身の generateInsights は楠奥）
// Gemini のキーはサーバーにしかないので、まとめ画面はここを経由して気づきを受け取る
import { z } from 'zod';
import { loadState } from '@/lib/analysis/jobs';
import { generateInsights } from '@/lib/summary/insights';
import type { BoardState, IdMap } from '@/types/state';

const Body = z.object({ roomId: z.uuid() });

// 画面に返す形。ideaIds は notes.id（UUID）
type InsightOut = { text: string; ideaIds: string[] };

// USE_MOCK_LLM=true のときの気づき。Gemini を呼ばずに、画面の表示だけ確かめられるようにする
function mockInsights(state: BoardState): { text: string; ideaIds: string[] }[] {
  if (state.ideas.length < 2) return [];
  const [a, b] = state.ideas;
  return [{ text: `（モック）「${a.label}」と「${b.label}」を組み合わせると、両方の良さを活かせるかもしれませんね。`, ideaIds: [a.id, b.id] }];
}

// 短いID（i1）→ UUID。状態にないIDは捨てる
function toUuids(insights: { text: string; ideaIds: string[] }[], idMap: IdMap): InsightOut[] {
  return insights.map((x) => ({
    text: x.text,
    ideaIds: x.ideaIds.map((id) => idMap[id]).filter((id): id is string => Boolean(id)),
  }));
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: '入力が不正' }, { status: 400 });

  try {
    const { state, idMap } = await loadState(parsed.data.roomId);
    const raw = process.env.USE_MOCK_LLM === 'true' ? mockInsights(state) : await generateInsights(state);
    return Response.json({ insights: toUuids(raw, idMap) });
  } catch (e) {
    console.error('気づきの生成に失敗', e);
    return Response.json({ error: '気づきの生成に失敗' }, { status: 500 });
  }
}
