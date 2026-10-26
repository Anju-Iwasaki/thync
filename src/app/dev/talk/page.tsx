'use client';
// 大槻の作業場所（見た目づくり用）。見本データでトークだけを表示する
// 見本のIDはDBにないので、ここで送信・賛否を押しても保存されない（エラーになる）。
// 送信やRealtimeを確かめるときは/room/…のトークタブを開く
import TalkRoom from '@/components/talk/TalkRoom';
import { sample } from '@/lib/sample';

export default function DevTalkPage() {
  return (
    <main>
      <TalkRoom
        memberId={sample.members[0].id}
        members={sample.members}
        messages={sample.messages}
        reactions={sample.reactions}
      />
    </main>
  );
}
