'use client';
// まとめルーム  担当：まお
// buildSummary（src/lib/summary/buildSummary.ts）で集計して表示する
import type { Member, Note, Reaction } from '@/types/rows';

export type SummaryRoomProps = {
  members: Member[];       // 発案者の名前の表示用
  notes: Note[];
  reactions: Reaction[];
};

export default function SummaryRoom({ members, notes, reactions }: SummaryRoomProps) {
  // ここからまおさんが書く
  return (
    <p>
      SummaryRoom（未実装）：付箋 {notes.length} 件・リアクション {reactions.length} 件・メンバー {members.length} 人
    </p>
  );
}
