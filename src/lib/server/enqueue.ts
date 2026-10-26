// ジョブ受付　 担当：岩崎
import 'server-only';
import type { Job } from '@/types/rows';

// 部屋の方式とメッセージの状態から、ジョブを積むか決める。
// 積めたら runNextJob を起動する。重複（一意制約違反）なら null
export async function enqueue(messageId: string): Promise<Job | null> {
  throw new Error('未実装: enqueue');
}
