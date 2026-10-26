// 部屋のページ。URLの [id] を受け取って画面に渡すだけ
import { Suspense } from 'react';
import RoomDev from './RoomDev';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  // URLの値は表示のたびに変わるので、Suspense の内側で待つ（Cache Components の決まり）
  return (
    <Suspense fallback={<p>読み込み中…</p>}>
      <RoomById params={params} />
    </Suspense>
  );
}

async function RoomById({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoomDev roomId={id} />;
}
