// まとめの集計　担当：大槻
import type { Note, Reaction } from "@/types/rows";

export type SummaryRow = {
  ideaId: string;         // notes.id
  label: string;
  proposerId: string;
  pro: number;            // 発案者を除く
  con: number;            // 発案者を除く
  reasons: string[];
  problems: {
    id: string;
    label: string;
    solutions: string[];
  }[];
};

/**
 * 付箋とリアクションからSummary表示用のデータを生成する。
 *
 * Noteの親子関係:
 * idea
 * ├─ reason
 * └─ problem
 *    └─ solution
 *
 * 賛否はideaの元メッセージへのリアクションから集計する。
 * 発案者自身の票は数えない。
 */
export function buildSummary(
  notes: Note[],
  reactions: Reaction[]
): SummaryRow[] {
  // 付箋IDから付箋を引けるようにする
  const noteById = new Map(
    notes.map((note) => [note.id, note])
  );

  // 親付箋IDごとに子付箋をまとめる
  const childrenByParent = new Map<string, Note[]>();

  for (const note of notes) {
    if (!note.parent_id) continue;

    const children =
      childrenByParent.get(note.parent_id) ?? [];

    children.push(note);
    childrenByParent.set(note.parent_id, children);
  }

  // メッセージIDごとにリアクションをまとめる
  const reactionsByMessage = new Map<
    string,
    Reaction[]
  >();

  for (const reaction of reactions) {
    const existing =
      reactionsByMessage.get(reaction.message_id) ?? [];

    existing.push(reaction);
    reactionsByMessage.set(
      reaction.message_id,
      existing
    );
  }

  // アイデア付箋のみをSummaryの行にする
  const ideas = notes
    .filter((note) => note.kind === "idea")
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );

  return ideas.map((idea): SummaryRow => {
    const children =
      childrenByParent.get(idea.id) ?? [];

    // 案に紐付いた賛成理由
    const reasons = children
      .filter((note) => note.kind === "reason")
      .map((note) => note.label);

    // 案に紐付いた問題点
    const problems = children
      .filter((note) => note.kind === "problem")
      .map((problem) => {
        const problemChildren =
          childrenByParent.get(problem.id) ?? [];

        const solutions = problemChildren
          .filter((note) => note.kind === "solution")
          .map((note) => note.label);

        return {
          id: problem.id,
          label: problem.label,
          solutions,
        };
      });

    // 元の発言に対するリアクションを取得
    const ideaReactions =
      reactionsByMessage.get(
        idea.source_message_id
      ) ?? [];

    // 同じメンバーが重複して数えられないようにする
    const votesByMember = new Map<string, string>();

    for (const reaction of ideaReactions) {
      // 発案者本人の票は除外する
      if (reaction.member_id === idea.proposer_id) {
        continue;
      }

      // 定義されている賛否のみ対象
      if (
        reaction.value !== "pro" &&
        reaction.value !== "con"
      ) {
        continue;
      }

      votesByMember.set(
        reaction.member_id,
        reaction.value
      );
    }

    let pro = 0;
    let con = 0;

    for (const value of votesByMember.values()) {
      if (value === "pro") {
        pro++;
      } else if (value === "con") {
        con++;
      }
    }

    return {
      ideaId: idea.id,
      label: idea.label,
      proposerId: idea.proposer_id,
      pro,
      con,
      reasons,
      problems,
    };
  });
}
