
import type { Member, Note, Reaction } from "@/types/rows";
import {
    buildSummary,
    type SummaryRow,
} from "./buildSummary";

export type PreviewInsight = {
    text: string;
    ideaIds: string[];
};

type PreviewSummary = {
    rows: SummaryRow[];
    insights: PreviewInsight[];
};

/**
 * Summary UIの動作確認用。
 *
 * 実際のDBやAIには接続しない。
 * NoteとReactionのモックを作り、
 * 本物のbuildSummaryで集計する。
 */
export function getPreviewSummary(
    groupId: string,
    members: Member[]
): PreviewSummary {
    const notes: Note[] = [];
    const reactions: Reaction[] = [];

    const memberId = (index: number): string =>
        members[index]?.id ?? `preview-member-${index}`;

    // Noteテーブルと同じ形式の付箋を追加
    const addNote = (
        id: string,
        kind: "idea" | "reason" | "problem" | "solution",
        label: string,
        proposerIndex: number,
        sourceMessageId: string,
        parentId: string | null = null
    ) => {
        notes.push({
            id,
            room_id: groupId,
            kind,
            label,
            parent_id: parentId,
            proposer_id: memberId(proposerIndex),
            source_message_id: sourceMessageId,
            created_at: "2026-10-30T10:00:00.000Z",
            embedding: null,
            x: null,
            y: null,
        });
    };

    // 元メッセージに対する賛否を追加
    const addVotes = (
        messageId: string,
        voterIndices: number[],
        value: "pro" | "con"
    ) => {
        for (const index of voterIndices) {
            // 実在するサンプルメンバーだけを使用
            if (!members[index]) continue;

            reactions.push({
                member_id: memberId(index),
                message_id: messageId,
                value,
            });
        }
    };

    let insights: PreviewInsight[] = [];

    if (groupId === "group-1") {
        // 案1
        addNote(
            "preview-idea-1",
            "idea",
            "AIで議論を整理する",
            0,
            "preview-message-1"
        );

        addNote(
            "preview-reason-1",
            "reason",
            "話し合いの内容を後から確認しやすい",
            1,
            "preview-message-reason-1",
            "preview-idea-1"
        );

        addNote(
            "preview-reason-2",
            "reason",
            "意見を整理する手間を減らせる",
            2,
            "preview-message-reason-2",
            "preview-idea-1"
        );

        addNote(
            "preview-problem-1",
            "problem",
            "開発時間がかかる",
            3,
            "preview-message-problem-1",
            "preview-idea-1"
        );

        addNote(
            "preview-solution-1",
            "solution",
            "最初は解析する機能を絞る",
            0,
            "preview-message-solution-1",
            "preview-problem-1"
        );

        addVotes("preview-message-1", [1, 2, 3], "pro");

        // 発案者本人の票は集計対象から除外される
        addVotes("preview-message-1", [0], "pro");

        // 案2
        addNote(
            "preview-idea-2",
            "idea",
            "可視化を中心にする",
            1,
            "preview-message-2"
        );

        addNote(
            "preview-reason-3",
            "reason",
            "意見同士の関係を直感的に理解できる",
            0,
            "preview-message-reason-3",
            "preview-idea-2"
        );

        addNote(
            "preview-problem-2",
            "problem",
            "情報量が増えたときに見づらくなる",
            2,
            "preview-message-problem-2",
            "preview-idea-2"
        );

        addNote(
            "preview-solution-2",
            "solution",
            "付箋を種類ごとに整理する",
            3,
            "preview-message-solution-2",
            "preview-problem-2"
        );

        addNote(
            "preview-solution-3",
            "solution",
            "表示範囲を調整できるようにする",
            0,
            "preview-message-solution-3",
            "preview-problem-2"
        );

        addVotes("preview-message-2", [0, 2, 3], "pro");

        // 案3
        addNote(
            "preview-idea-3",
            "idea",
            "Webアプリにする",
            2,
            "preview-message-3"
        );

        addNote(
            "preview-reason-4",
            "reason",
            "ブラウザから気軽に参加できる",
            0,
            "preview-message-reason-4",
            "preview-idea-3"
        );

        addNote(
            "preview-problem-3",
            "problem",
            "リアルタイム処理の負荷が大きい",
            1,
            "preview-message-problem-3",
            "preview-idea-3"
        );

        addVotes("preview-message-3", [0, 1], "pro");

        insights = [
            {
                text:
                    "「AIで議論を整理する」案は支持が多い一方、開発時間が課題です。解析範囲を限定することが改善につながる可能性があります。",
                ideaIds: ["preview-idea-1"],
            },
        ];
    } else if (groupId === "group-2") {
        // 研究室旅行
        addNote(
            "preview-trip-1",
            "idea",
            "温泉地へ旅行する",
            0,
            "preview-trip-message-1"
        );

        addNote(
            "preview-trip-problem-1",
            "problem",
            "移動費が高くなる可能性がある",
            1,
            "preview-trip-problem-message",
            "preview-trip-1"
        );

        addNote(
            "preview-trip-solution-1",
            "solution",
            "大学から近い温泉地を候補にする",
            2,
            "preview-trip-solution-message",
            "preview-trip-problem-1"
        );

        addVotes("preview-trip-message-1", [1, 2, 3], "pro");

        addNote(
            "preview-trip-2",
            "idea",
            "日帰り旅行にする",
            1,
            "preview-trip-message-2"
        );

        addVotes("preview-trip-message-2", [0, 2], "pro");
    } else if (groupId === "group-3") {
        // 学園祭
        addNote(
            "preview-festival-1",
            "idea",
            "体験型の展示を行う",
            0,
            "preview-festival-message-1"
        );

        addNote(
            "preview-festival-problem-1",
            "problem",
            "準備に時間がかかる",
            1,
            "preview-festival-problem-message",
            "preview-festival-1"
        );

        addNote(
            "preview-festival-solution-1",
            "solution",
            "体験内容を一つに絞る",
            2,
            "preview-festival-solution-message",
            "preview-festival-problem-1"
        );

        addVotes(
            "preview-festival-message-1",
            [1, 2],
            "pro"
        );

        addNote(
            "preview-festival-2",
            "idea",
            "作品展示を中心にする",
            1,
            "preview-festival-message-2"
        );

        addVotes(
            "preview-festival-message-2",
            [0],
            "pro"
        );
    }

    // 手入力した集計結果ではなく、
    // 実際の集計関数を呼び出す
    return {
        rows: buildSummary(notes, reactions),
        insights,
    };
}
