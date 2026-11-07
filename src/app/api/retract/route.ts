import { z } from 'zod';
import { retract, RetractError } from '@/lib/server/retract';

const Body = z.object({ messageId: z.uuid(), memberId: z.uuid() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: '入力が不正' }, { status: 400 });

  try {
    await retract(parsed.data.messageId, parsed.data.memberId);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof RetractError) return Response.json({ error: e.message }, { status: e.status });
    console.error('送信取り消しに失敗', e);
    return Response.json({ error: '送信取り消しに失敗' }, { status: 500 });
  }
}
