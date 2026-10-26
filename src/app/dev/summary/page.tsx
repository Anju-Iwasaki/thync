'use client';
// 大槻の作業場所。見本データでまとめだけを表示する
import SummaryRoom from '@/components/summary/SummaryRoom';
import { sample } from '@/lib/sample';

export default function DevSummaryPage() {
  return (
    <main>
      <SummaryRoom members={sample.members} notes={sample.notes} reactions={sample.reactions} />
    </main>
  );
}
