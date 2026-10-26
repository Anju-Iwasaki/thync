'use client';
// トークルーム  担当：まお
// 書き込みは '@/client/actions' の関数だけを使う（sendMessage, react, unreact, retractMessage）
import type { Member, Message, Reaction } from '@/types/rows';

export type TalkRoomProps = {
  memberId: string;        // 自分
  members: Member[];       // 名前の表示用
  messages: Message[];     // 古い順。retracted_at があれば「取り消されました」
  reactions: Reaction[];   // 賛否の数と、自分が押したか
};

export default function TalkRoom({ memberId, members, messages, reactions }: TalkRoomProps) {
  // ここからまおさんが書く
  return (
    <p>
      TalkRoom（未実装）：発言 {messages.length} 件・メンバー {members.length} 人・リアクション {reactions.length} 件
    </p>
  );
}
