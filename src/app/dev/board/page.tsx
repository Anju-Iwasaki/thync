'use client';
// 森の作業場所。見本データでボードだけを画面全体に描く
// 本物のデータで確かめるときは/room/…のTHYNCタブを開く
import Board from '@/components/board/Board';
import { sample } from '@/lib/sample';

export default function DevBoardPage() {
  return (
    <main style={{ width: '100vw', height: '100vh' }}>
      <Board notes={sample.notes} scale={sample.room.board_scale} />
    </main>
  );
}
