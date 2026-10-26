// 送信取り消し　担当：岩崎
import 'server-only';

// 本人の発言か確認 → retracted_at を入れる → その発言の note を消す（子はCASCADE）
// → その発言への reactions を消す
export async function retract(messageId: string, memberId: string): Promise<void> {
  throw new Error('未実装: retract');
}
