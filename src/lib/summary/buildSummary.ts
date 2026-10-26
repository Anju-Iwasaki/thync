// まとめの集計　担当：大槻
import type { Note, Reaction } from '@/types/rows';

export type SummaryRow = {
  ideaId: string;          // notes.id
  label: string;
  proposerId: string;
  pro: number;             //発案者を除く
  con: number;             //発案者を除く
  reasons: string[];
  problems: { id: string; label: string; solutions: string[] }[];
};

export function buildSummary(notes: Note[], reactions: Reaction[]): SummaryRow[] {
  throw new Error('未実装: buildSummary');
}
