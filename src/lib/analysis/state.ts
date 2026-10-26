// notesを木（BoardState）に組み直し、短いIDを振る（純粋関数）  担当：岩崎
// loadState（本番）と、見本データからプロンプト用の状態を作るときに使う
import type { BoardState, IdMap } from '@/types/state';
import type { Note } from '@/types/rows';

// 短いIDは種類ごとに作成順で振る：案 i1, i2 … / 問題点 p1 … / 解決案 s1 … / 理由 r1 …
const PREFIX = { idea: 'i', problem: 'p', solution: 's', reason: 'r' } as const;

export function buildState(topic: string, notes: Note[]): { state: BoardState; idMap: IdMap } {
  const sorted = [...notes].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const counter = { idea: 0, problem: 0, solution: 0, reason: 0 };
  const shortOf = new Map<string, string>();   // UUID → 短いID
  const idMap: IdMap = {};                     // 短いID → UUID

  for (const n of sorted) {
    const kind = n.kind as keyof typeof PREFIX;
    const short = `${PREFIX[kind]}${++counter[kind]}`;
    shortOf.set(n.id, short);
    idMap[short] = n.id;
  }

  const childrenOf = (parentId: string, kind: string) =>
    sorted.filter((n) => n.parent_id === parentId && n.kind === kind);
  const item = (n: Note) => ({ id: shortOf.get(n.id)!, label: n.label });

  const state: BoardState = {
    topic,
    ideas: sorted
      .filter((n) => n.kind === 'idea')
      .map((idea) => ({
        ...item(idea),
        reasons: childrenOf(idea.id, 'reason').map(item),
        problems: childrenOf(idea.id, 'problem').map((p) => ({
          ...item(p),
          solutions: childrenOf(p.id, 'solution').map(item),
        })),
      })),
  };
  return { state, idMap };
}
