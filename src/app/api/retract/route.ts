import { retract } from '@/lib/server/retract';

export async function POST(req: Request) {
  const { messageId, memberId } = await req.json();
  await retract(messageId, memberId);
  return Response.json({ ok: true });
}
