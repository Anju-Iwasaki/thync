'use client';
// THYNCルームのボード  担当：森
// 渡された notes を付箋としてSVGで描く。データは自分で取りに行かない
import type { Note } from '@/types/rows';

export type BoardProps = {
  notes: Note[];   // 部屋の付箋すべて（理由 reason は描かない。まとめ用）
  scale: number;   // rooms.board_scale。案の座標 x, y にかけて描く
};

export default function Board({ notes, scale }: BoardProps) {
  // ここから森さんが書く
  return (
    <p>
      Board（未実装）：付箋 {notes.length} 件・倍率 {scale}
    </p>
  );
}
