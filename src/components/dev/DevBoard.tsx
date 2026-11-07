'use client';
// 仮のボード（岩崎）。付箋を木の形の文字で並べるだけ。森のBoardができたら外す
import type { BoardProps } from '@/components/board/Board';

export default function DevBoard({ notes, scale }: BoardProps) {
  const children = (parentId: string | null, kind: string) =>
    notes.filter((n) => n.parent_id === parentId && n.kind === kind);

  return (
    <section>
      <p>倍率 {scale}</p>
      {children(null, 'idea').length === 0 && <p>付箋なし</p>}
      <ul>
        {children(null, 'idea').map((idea) => (
          <li key={idea.id}>
            <b>案：{idea.label}</b>（x={idea.x}, y={idea.y}）
            <ul>
              {children(idea.id, 'reason').map((r) => <li key={r.id}>理由：{r.label}</li>)}
              {children(idea.id, 'problem').map((p) => (
                <li key={p.id}>
                  問題：{p.label}
                  <ul>{children(p.id, 'solution').map((s) => <li key={s.id}>解決：{s.label}</li>)}</ul>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
