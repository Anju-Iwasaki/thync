import { z } from 'zod';
import { enqueue } from '@/lib/server/enqueue';

const Body = z.object({ messageId: z.uuid(), cause: z.enum(['send', 'react']) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: '入力が不正' }, { status: 400 });

  try {
    const job = await enqueue(parsed.data.messageId, parsed.data.cause);
    return Response.json({ job });
  } catch (e) {
    console.error('enqueue に失敗', e);
    return Response.json({ error: 'enqueue に失敗' }, { status: 500 });
  }
}
