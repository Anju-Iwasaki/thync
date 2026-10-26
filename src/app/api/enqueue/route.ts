import { enqueue } from '@/lib/server/enqueue';

export async function POST(req: Request) {
  const { messageId } = await req.json();
  const job = await enqueue(messageId);
  return Response.json({ job });
}
