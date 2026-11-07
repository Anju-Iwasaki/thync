
"use client";

import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
} from "react";

import type {
    Member, Note, Message, Reaction,
} from "@/types/rows";
import { cosine } from "@/lib/layout/similarity";
import styles from "./ThyncBoard.module.css";
import expansionStyles from "./ThyncExpansion.module.css";
import { placeChild } from "@/lib/layout/placeChild";
import { placeMockIdeas } from "./mockPlacement";
import { layoutBySimilarity } from "./layoutBySimilarity";

export type BoardMode = "auto" | "mock" | "live";


type BoardNote = Pick<
    Note,
    "id" | "parent_id" | "kind" | "label" |
    "x" | "y" | "proposer_id"
> & {
    embedding?: string | null;
    source_message_id?: string | null;
    created_at?: string | null;
};


type BoardNode = {
    note: BoardNote;
    x: number;
    y: number;
    width: number;
    height: number;
};

type Connection = {
    from: BoardNode;
    to: BoardNode;
};

type BoardGraph = {
    nodes: BoardNode[];
    connections: Connection[];
    width: number;
    height: number;
};

export type BoardLineStyle = "soft" | "rounded";

type BoardPath = {
    key: string;
    d: string;
    relatedIds: string[];
};


type Props = {
    notes: Note[];
    members: Member[];
    messages: Message[];
    reactions: Reaction[];
    onJumpToMessage: (messageId: string) => void;
    mode?: BoardMode;
    lineStyle?: BoardLineStyle;
};


// UI検証専用のサンプルデータ。
// Supabaseへの書き込みは一切行わない。
function demoNote(
    id: string,
    kind: BoardNote["kind"],
    parent_id: string | null,
    label: string,
    x: number | null = null,
    y: number | null = null
): BoardNote {
    return {
        id,
        kind,
        parent_id,
        label,
        x,
        y,
        proposer_id: "demo-member",
    };
}


const MOCK_NOTES: BoardNote[] = [
    // ① お化け屋敷
    demoNote("i1", "idea", null, "文化祭でお化け屋敷を開催する", 0, 0),
    demoNote("r1", "reason", "i1", "来場者に楽しんでもらえる"),
    demoNote("r2", "reason", "i1", "クラス全員が参加できる"),
    demoNote("p1", "problem", "i1", "準備に時間と人手が必要"),
    demoNote("s1", "solution", "p1", "担当班を分けて作業する"),
    demoNote("s2", "solution", "p1", "制作スケジュールを共有する"),
    demoNote("p2", "problem", "i1", "安全面の対策が必要"),
    demoNote("s3", "solution", "p2", "通路と避難経路を確保する"),

    // ② 謎解きスタンプラリー
    demoNote("i2", "idea", null, "謎解きスタンプラリーを開催する", 220, 0),
    demoNote("r3", "reason", "i2", "校内全体を活用できる"),
    demoNote("p3", "problem", "i2", "問題制作の負担が大きい"),
    demoNote("s4", "solution", "p3", "クラスごとに問題を分担する"),

    // ③ 脱出ゲーム
    demoNote("i3", "idea", null, "教室を使った脱出ゲームを開催する", 440, 0),
    demoNote("r4", "reason", "i3", "参加者同士で協力して楽しめる"),
    demoNote("p4", "problem", "i3", "一度に参加できる人数が少ない"),
    demoNote("s5", "solution", "p4", "複数の部屋で同時開催する"),

    // ④ カフェ
    demoNote("i4", "idea", null, "クラスでテーマカフェを運営する", 660, 0),
    demoNote("r5", "reason", "i4", "休憩場所としても利用できる"),
    demoNote("p5", "problem", "i4", "衛生管理と材料費が課題になる"),
    demoNote("s6", "solution", "p5", "メニューを少数に絞る"),

    // ⑤ 屋台
    demoNote("i5", "idea", null, "校庭に軽食の屋台を出す", 880, 0),
    demoNote("r6", "reason", "i5", "幅広い来場者に利用してもらえる"),
    demoNote("p6", "problem", "i5", "天候によって売上が左右される"),
    demoNote("s7", "solution", "p6", "屋内の代替販売場所を確保する"),

    // ⑥ 写真スポット
    demoNote("i6", "idea", null, "巨大なフォトスポットを制作する", 1100, 0),
    demoNote("r7", "reason", "i6", "記念写真を残せる"),
    demoNote("p7", "problem", "i6", "撮影待ちの行列ができる"),
    demoNote("s8", "solution", "p7", "複数の撮影場所を設置する"),

    // ⑦ ステージ
    demoNote("i7", "idea", null, "生徒によるステージライブを開催する", 1320, 0),
    demoNote("r8", "reason", "i7", "音楽やダンスを披露できる"),
    demoNote("p8", "problem", "i7", "音響機材とリハーサルが必要"),
    demoNote("s9", "solution", "p8", "事前に出演時間を調整する"),

    // ⑧ 展示
    demoNote("i8", "idea", null, "体験型の科学展示を行う", 1540, 0),
    demoNote("r9", "reason", "i8", "来場者が実際に体験して学べる"),
    demoNote("p9", "problem", "i8", "展示装置の故障が心配"),
    demoNote("s10", "solution", "p9", "予備の装置を準備する"),

    // ⑨ ゲーム大会
    demoNote("i9", "idea", null, "校内ゲーム大会を開催する", 1760, 0),
    demoNote("r10", "reason", "i9", "参加者同士の交流が生まれる"),
    demoNote("p10", "problem", "i9", "対戦の待ち時間が長くなる"),
    demoNote("s11", "solution", "p10", "予選を複数の会場で行う"),

    // ⑩ 作品展示
    demoNote("i10", "idea", null, "生徒の作品を集めた美術展を開く", 1980, 0),
    demoNote("r11", "reason", "i10", "さまざまな作品を紹介できる"),
    demoNote("p11", "problem", "i10", "展示スペースが不足する"),
    demoNote("s12", "solution", "p11", "作品ごとに展示期間を分ける"),
];


const KIND_LABEL: Record<BoardNote["kind"], string> = {
    idea: "アイデア",
    reason: "賛成理由",
    problem: "問題点",
    solution: "解決策",
};

// notesの親子関係から表示用の座標・接続線を作る。
// DBやAIの処理には触れない純粋な表示用関数。



function buildGraph(
    data: readonly BoardNote[],
    gridPreview = false
): BoardGraph {
    const nodes: BoardNode[] = [];
    const connections: Connection[] = [];

    let maxX = 1000;
    let maxY = 650;


    const ideas = data.filter(
        (note) => note.kind === "idea"
    );


    const children = (
        parentId: string,
        kind: BoardNote["kind"]
    ) =>
        data.filter(
            (note) =>
                note.parent_id === parentId &&
                note.kind === kind
        );

    const add = (
        note: BoardNote,
        x: number,
        y: number,
        width: number,
        height: number
    ): BoardNode => {
        const node = {
            note,
            x,
            y,
            width,
            height,
        };

        nodes.push(node);

        maxX = Math.max(maxX, x + width + 65);
        maxY = Math.max(maxY, y + height + 110);

        return node;
    };

    // ------------------------------------------------
    // 各アイデアが占める範囲を計算する
    // ------------------------------------------------
    const islandHeight = (ideaId: string): number => {
        const reasons = children(ideaId, "reason");
        const problems = children(ideaId, "problem");

        let bottom = 112;

        if (reasons.length > 0) {
            bottom = Math.max(
                bottom,
                200 + (reasons.length - 1) * 142 + 120
            );
        }

        let problemOffset = 0;

        for (const problem of problems) {
            const solutions = children(
                problem.id,
                "solution"
            );

            bottom = Math.max(
                bottom,
                200 + problemOffset + 120
            );

            if (solutions.length > 0) {
                bottom = Math.max(
                    bottom,
                    200 +
                    problemOffset +
                    170 +
                    (solutions.length - 1) * 142 +
                    120
                );
            }

            problemOffset += Math.max(
                150,
                170 + solutions.length * 142 + 30
            );
        }

        return bottom + 70;
    };

    // モックだけ、Embeddingに基づく2次元配置を使う。
    // 実データはDBに保存された座標を優先する。
    const mockOrigins = gridPreview
        ? placeMockIdeas(
            ideas.map((idea) => ({
                id: idea.id,
                height: islandHeight(idea.id),
            }))
        )
        : null;


    // 実データ：Embeddingを使って表示用の位置を再計算
    // モック表示の配置は従来どおり。
    const semanticOrigins = gridPreview
        ? null
        : layoutBySimilarity(
            ideas.map((idea, index) => ({
                id: idea.id,
                x: idea.x ?? index * 220,
                y: idea.y ?? 0,
                embedding: idea.embedding ?? null,
            }))
        );


    const rawXs = ideas.map(
        (idea, index) => idea.x ?? index * 220
    );
    const rawYs = ideas.map(
        (idea) => idea.y ?? 0
    );


    const minX = Math.min(0, ...rawXs);
    const minY = Math.min(0, ...rawYs);

    // 表示済みアイデアの配置位置
    const occupiedOrigins: {
        x: number;
        y: number;
    }[] = [];

    // 親アイデア付箋が重ならないための余白
    const MIN_GAP_X = 300;
    const MIN_GAP_Y = 180;

    const isFree = (x: number, y: number) =>
        occupiedOrigins.every(
            (other) =>
                Math.abs(x - other.x) >= MIN_GAP_X ||
                Math.abs(y - other.y) >= MIN_GAP_Y
        );

    // ------------------------------------------------
    // アイデアと子付箋を描画用のグラフへ変換
    // ------------------------------------------------
    ideas.forEach((idea, index) => {
        const rawX = rawXs[index];
        const rawY = rawYs[index];

        // DBの2次元座標を基本的にそのまま利用
        const desiredX = 85 + (rawX - minX);
        const desiredY = 140 + (rawY - minY);

        let liveOriginX = desiredX;
        let liveOriginY = desiredY;

        // 衝突した場合のみ近くの空き位置を探索
        if (!isFree(liveOriginX, liveOriginY)) {
            let found = false;

            for (
                let radius = 80;
                radius <= 2400 && !found;
                radius += 80
            ) {
                for (let i = 0; i < 32; i++) {
                    const angle =
                        (2 * Math.PI * i) / 32;

                    const x =
                        desiredX +
                        Math.cos(angle) * radius;

                    const y =
                        desiredY +
                        Math.sin(angle) * radius;

                    if (isFree(x, y)) {
                        liveOriginX = x;
                        liveOriginY = y;
                        found = true;
                        break;
                    }
                }
            }
        }

        occupiedOrigins.push({
            x: liveOriginX,
            y: liveOriginY,
        });




        // モック配置を優先。
        // 実データはEmbeddingに基づく表示用座標を採用。
        const mock = mockOrigins?.get(idea.id);
        const semantic = semanticOrigins?.get(idea.id);

        const originX =
            mock?.x ?? semantic?.x ?? liveOriginX;

        const originY =
            mock?.y ?? semantic?.y ?? liveOriginY;


        // アイデア：島の中心上部
        const root = add(
            idea,
            originX + 265,
            originY,
            235,
            112
        );

        // 賛成理由：アイデアの左側
        const reasons = children(idea.id, "reason");

        reasons.forEach((reason, i) => {
            const node = add(
                reason,
                originX + 45,
                originY + 200 + i * 142,
                210,
                120
            );

            connections.push({
                from: root,
                to: node,
            });
        });

        // 問題点：右側
        const problems = children(idea.id, "problem");

        let problemOffset = 0;

        for (const problem of problems) {
            const base = placeChild("problem", 0);

            const problemY =
                originY + base.dy + problemOffset;

            const problemNode = add(
                problem,
                originX + base.dx,
                problemY,
                210,
                120
            );

            connections.push({
                from: root,
                to: problemNode,
            });

            // 解決策：問題点の右下
            const solutions = children(
                problem.id,
                "solution"
            );

            solutions.forEach((solution, i) => {
                const offset = placeChild(
                    "solution",
                    i
                );

                const node = add(
                    solution,
                    problemNode.x + offset.dx,
                    problemNode.y + offset.dy,
                    205,
                    120
                );

                connections.push({
                    from: problemNode,
                    to: node,
                });
            });

            // 解決策が多い問題点には余白を確保
            problemOffset += Math.max(
                150,
                170 + solutions.length * 142 + 30
            );
        }
    });

    return {
        nodes,
        connections,
        width: Math.ceil(maxX),
        height: Math.ceil(maxY),
    };
}





// 同じ親を持つ子付箋の線を束ねる。
// 子の側面 → 共通の合流路 → 親の下側、という接続方式。



function buildConnectionPaths(
    connections: readonly Connection[],
    style: BoardLineStyle
): BoardPath[] {
    const paths: BoardPath[] = [];
    const groups = new Map<string, Connection[]>();

    for (const connection of connections) {
        const id = connection.from.note.id;
        const list = groups.get(id) ?? [];
        list.push(connection);
        groups.set(id, list);
    }

    const addPath = (
        key: string,
        d: string,
        relatedIds: string[]
    ) => {
        paths.push({
            key,
            d: d.replace(/\s+/g, " ").trim(),
            relatedIds,
        });
    };

    function uniqueIds(ids: string[]): string[] {
        return [...new Set(ids)];
    }

    function softPath(from: BoardNode, to: BoardNode): string {
        if (
            from.note.kind === "problem" &&
            to.note.kind === "solution"
        ) {
            const x1 = from.x + from.width * 0.22;
            const y1 = from.y + from.height;

            const x2 = to.x;
            const y2 = to.y + to.height / 2;

            const dx = Math.abs(x2 - x1);
            const dy = Math.max(0, y2 - y1);

            const c1x = x1 + Math.min(44, dx * 0.18);
            const c1y = y1 + Math.min(90, Math.max(34, dy * 0.45));
            const c2x = x2 - Math.min(80, dx * 0.42);
            const c2y = y2;

            return `
                M ${x1} ${y1}
                C ${c1x} ${c1y},
                  ${c2x} ${c2y},
                  ${x2} ${y2}
            `;
        }

        const x1 = from.x + from.width / 2;
        const y1 = from.y + from.height;

        const isLeft =
            to.x + to.width / 2 < x1;

        const x2 = isLeft
            ? to.x + to.width
            : to.x;

        const y2 = to.y + to.height / 2;

        const direction = isLeft ? -1 : 1;
        const dx = Math.abs(x2 - x1);
        const dy = Math.max(0, y2 - y1);

        const c1x = x1 + direction * Math.min(54, dx * 0.22);
        const c1y = y1 + Math.min(120, Math.max(48, dy * 0.42));
        const c2x = x2 - direction * Math.min(96, dx * 0.45);
        const c2y = y2;

        return `
            M ${x1} ${y1}
            C ${c1x} ${c1y},
              ${c2x} ${c2y},
              ${x2} ${y2}
        `;
    }

    for (const [parentId, group] of groups) {
        if (group.length === 0) continue;

        const parent = group[0].from;

        // =========================================
        // A. 有機的スタイル
        // =========================================
        if (style === "soft") {
            for (const connection of group) {
                addPath(
                    `soft-${parentId}-${connection.to.note.id}`,
                    softPath(connection.from, connection.to),
                    [parentId, connection.to.note.id]
                );
            }
            continue;
        }

        // =========================================
        // B. 構造的スタイル
        // =========================================

        // -----------------------------------------
        // 問題点 → 解決策
        // -----------------------------------------
        if (parent.note.kind === "problem") {
            const children = [...group].sort(
                (a, b) => a.to.y - b.to.y
            );

            const stemX =
                parent.x + parent.width * 0.22;

            const startY =
                parent.y + parent.height;

            const points = children.map(({ to }) => ({
                id: to.note.id,
                x: to.x,
                y: to.y + to.height / 2,
            }));

            let currentTop = startY;
            const radius = 18;

            for (let i = 0; i < points.length; i += 1) {
                const point = points[i];
                const remainingIds = points
                    .slice(i)
                    .map((p) => p.id);

                const childRadius = Math.min(
                    radius,
                    Math.max(10, Math.abs(point.x - stemX) * 0.35)
                );

                const verticalEnd = point.y - childRadius;

                if (verticalEnd > currentTop) {
                    addPath(
                        `problem-stem-${parentId}-${point.id}`,
                        `
                            M ${stemX} ${currentTop}
                            V ${verticalEnd}
                        `,
                        uniqueIds([parentId, ...remainingIds])
                    );
                }

                addPath(
                    `problem-branch-${parentId}-${point.id}`,
                    `
                        M ${stemX} ${point.y - childRadius}
                        Q ${stemX} ${point.y},
                          ${stemX + childRadius} ${point.y}
                        H ${point.x}
                    `,
                    [parentId, point.id]
                );

                currentTop = point.y;
            }

            continue;
        }

        // -----------------------------------------
        // アイデア → 賛成理由 / 問題点
        // -----------------------------------------
        if (parent.note.kind === "idea") {
            const centerX =
                parent.x + parent.width / 2;

            const bottomY =
                parent.y + parent.height;

            const branchY = bottomY + 44;
            const topRadius = 18;

            const leftChildren = group
                .filter(({ to }) => to.note.kind === "reason")
                .sort((a, b) => a.to.y - b.to.y);

            const rightChildren = group
                .filter(({ to }) => to.note.kind === "problem")
                .sort((a, b) => a.to.y - b.to.y);

            const allChildIds = group.map((c) => c.to.note.id);

            addPath(
                `idea-trunk-${parentId}`,
                `
                    M ${centerX} ${bottomY}
                    V ${branchY - topRadius}
                `,
                uniqueIds([parentId, ...allChildIds])
            );

            const sideConfigs = [
                {
                    side: "left" as const,
                    direction: -1 as const,
                    children: leftChildren,
                },
                {
                    side: "right" as const,
                    direction: 1 as const,
                    children: rightChildren,
                },
            ];

            for (const config of sideConfigs) {
                if (config.children.length === 0) continue;

                const points = config.children.map(({ to }) => ({
                    id: to.note.id,
                    x:
                        config.side === "left"
                            ? to.x + to.width
                            : to.x,
                    y: to.y + to.height / 2,
                }));

                const sideIds = points.map((p) => p.id);

                const laneX =
                    config.side === "left"
                        ? Math.max(...points.map((p) => p.x)) + 24
                        : Math.min(...points.map((p) => p.x)) - 24;

                const entryRadius = Math.min(
                    18,
                    Math.max(10, Math.abs(laneX - centerX) * 0.25)
                );

                addPath(
                    `idea-entry-${parentId}-${config.side}`,
                    `
                        M ${centerX} ${branchY - topRadius}
                        Q ${centerX} ${branchY},
                          ${centerX + config.direction * topRadius} ${branchY}
                        H ${laneX - config.direction * entryRadius}
                        Q ${laneX} ${branchY},
                          ${laneX} ${branchY + entryRadius}
                    `,
                    uniqueIds([parentId, ...sideIds])
                );

                let currentTop = branchY + entryRadius;

                for (let i = 0; i < points.length; i += 1) {
                    const point = points[i];
                    const remainingIds = points
                        .slice(i)
                        .map((p) => p.id);

                    const childRadius = Math.min(
                        18,
                        Math.max(10, Math.abs(point.x - laneX) * 0.35)
                    );

                    const verticalEnd = point.y - childRadius;

                    if (verticalEnd > currentTop) {
                        addPath(
                            `idea-lane-${parentId}-${config.side}-${point.id}`,
                            `
                                M ${laneX} ${currentTop}
                                V ${verticalEnd}
                            `,
                            uniqueIds([parentId, ...remainingIds])
                        );
                    }

                    addPath(
                        `idea-branch-${parentId}-${config.side}-${point.id}`,
                        `
                            M ${laneX} ${point.y - childRadius}
                            Q ${laneX} ${point.y},
                              ${laneX + config.direction * childRadius} ${point.y}
                            H ${point.x}
                        `,
                        [parentId, point.id]
                    );

                    currentTop = point.y;
                }
            }
        }
    }

    return paths;
}


function kindClass(kind: BoardNote["kind"]): string {
    switch (kind) {
        case "idea":
            return styles.idea;

        case "reason":
            return styles.reason;

        case "problem":
            return styles.problem;

        case "solution":
            return styles.solution;

        default:
            // 未知の種類は共通スタイルのみで表示する
            return "";
    }
}



export default function ThyncBoard({
    notes,
    members,
    messages,
    reactions,
    onJumpToMessage,
    mode = "auto",
    lineStyle = "soft",
}: Props) {

    // 自動：notesがなければモック、あれば実データ
    const usingMock =
        mode === "mock" ||
        (mode === "auto" && notes.length === 0);

    const displayNotes = usingMock ? MOCK_NOTES : notes;

    const graph = useMemo(
        () => buildGraph(displayNotes, usingMock),
        [displayNotes, usingMock]
    );


    // ========================================
    // 一時的なEmbedding・配置デバッグ
    // 検証終了後に削除する
    // ========================================
    useEffect(() => {
        if (usingMock) return;

        const ideas = notes.filter(
            (note) => note.kind === "idea"
        );

        if (ideas.length === 0) return;

        const parseEmbedding = (
            value: string | null
        ): number[] | null => {
            if (!value) return null;

            try {
                const vector = JSON.parse(value) as number[];

                if (
                    !Array.isArray(vector) ||
                    vector.length === 0 ||
                    !vector.every(Number.isFinite)
                ) {
                    return null;
                }

                return vector;
            } catch {
                return null;
            }
        };

        const cosineSimilarity = (
            a: number[],
            b: number[]
        ): number | null => {
            if (a.length !== b.length) return null;

            let dot = 0;
            let normA = 0;
            let normB = 0;

            for (let i = 0; i < a.length; i++) {
                dot += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }

            if (normA === 0 || normB === 0) return null;

            return dot / (Math.sqrt(normA) * Math.sqrt(normB));
        };

        const rows: {
            アイデアA: string;
            アイデアB: string;
            コサイン類似度: number | string;
            DB座標間距離: number | string;
        }[] = [];

        console.group("THYNC Embedding・配置デバッグ");

        console.table(
            ideas.map((idea) => ({
                アイデア: idea.label,
                X座標: idea.x,
                Y座標: idea.y,
                Embedding次元数:
                    parseEmbedding(idea.embedding)?.length ?? 0,
            }))
        );

        for (let i = 0; i < ideas.length; i++) {
            for (let j = i + 1; j < ideas.length; j++) {
                const a = ideas[i];
                const b = ideas[j];

                const vectorA = parseEmbedding(a.embedding);
                const vectorB = parseEmbedding(b.embedding);

                const similarity =
                    vectorA && vectorB
                        ? cosineSimilarity(vectorA, vectorB)
                        : null;

                const distance =
                    a.x !== null &&
                        a.y !== null &&
                        b.x !== null &&
                        b.y !== null
                        ? Math.hypot(
                            a.x - b.x,
                            a.y - b.y
                        )
                        : null;

                rows.push({
                    アイデアA: a.label,
                    アイデアB: b.label,
                    コサイン類似度:
                        similarity === null
                            ? "計算不可"
                            : Number(similarity.toFixed(4)),
                    DB座標間距離:
                        distance === null
                            ? "座標なし"
                            : Number(distance.toFixed(1)),
                });
            }
        }

        rows.sort((a, b) => {
            const x =
                typeof a.コサイン類似度 === "number"
                    ? a.コサイン類似度
                    : -Infinity;

            const y =
                typeof b.コサイン類似度 === "number"
                    ? b.コサイン類似度
                    : -Infinity;

            return y - x;
        });

        console.table(rows);
        console.groupEnd();
    }, [notes, usingMock]);


    const [zoom, setZoom] = useState(0.85);
    const [pan, setPan] = useState({ x: 30, y: 10 });
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    // 60%以上では全文表示。
    // 38%以下で文字を透明にし、間は連続的に変化させる。
    const labelOpacity = Math.max(
        0,
        Math.min(1, (zoom - 0.38) / 0.22)
    );

    // トラックパッドの連続入力でも最新の位置・倍率を参照する
    const viewStateRef = useRef({
        zoom: 0.85,
        pan: { x: 30, y: 10 },
    });

    // ボードの表示領域を取得する
    const viewportRef = useRef<HTMLDivElement>(null);
    const detailRef = useRef<HTMLElement>(null);

    // 自動視点移動時だけアニメーションを有効にする
    const [animatePan, setAnimatePan] = useState(false);

    const dragRef = useRef<{
        startX: number;
        startY: number;
        panX: number;
        panY: number;
    } | null>(null);


    // ボタン・自動視点移動・手動ドラッグによる状態変更を同期する
    useEffect(() => {
        viewStateRef.current = { zoom, pan };
    }, [zoom, pan]);

    // ボード上でのみ、トラックパッド・マウスホイールを操作に変換
    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const handleWheel = (event: WheelEvent) => {
            // Webページ全体のスクロール・ズームを抑制
            if (event.cancelable) {
                event.preventDefault();
            }

            // deltaMode の単位をピクセル相当に変換
            const unit =
                event.deltaMode === 1
                    ? 16
                    : event.deltaMode === 2
                        ? viewport.clientHeight
                        : 1;

            const dx = event.deltaX * unit;
            const dy = event.deltaY * unit;

            const current = viewStateRef.current;

            // ピンチ操作は、多くのブラウザーで ctrlKey 付きwheelになる
            if (event.ctrlKey) {
                const rect = viewport.getBoundingClientRect();

                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;

                // 指の移動量に応じた滑らかな拡大縮小
                const factor = Math.exp(-dy * 0.008);

                const nextZoom = Math.max(
                    0.35,
                    Math.min(1.8, current.zoom * factor)
                );

                const ratio = nextZoom / current.zoom;

                // カーソルの下にあるボード上の点を固定する
                const nextPan = {
                    x:
                        mouseX -
                        (mouseX - current.pan.x) * ratio,
                    y:
                        mouseY -
                        (mouseY - current.pan.y) * ratio,
                };

                viewStateRef.current = {
                    zoom: nextZoom,
                    pan: nextPan,
                };

                setAnimatePan(false);
                setZoom(nextZoom);
                setPan(nextPan);
            } else {
                // 2本指スクロール：上下左右へ平行移動
                const nextPan = {
                    x: current.pan.x - dx,
                    y: current.pan.y - dy,
                };

                viewStateRef.current = {
                    zoom: current.zoom,
                    pan: nextPan,
                };

                setAnimatePan(false);
                setPan(nextPan);
            }
        };

        viewport.addEventListener(
            "wheel",
            handleWheel,
            { passive: false }
        );

        return () => {
            viewport.removeEventListener(
                "wheel",
                handleWheel
            );
        };
    }, []);



    // 選択中の島が見切れる場合だけカメラを移動する。
    // 詳細パネルの左側を優先し、
    // 横方向は空き領域の中央、縦方向は現在位置を優先する。
    useLayoutEffect(() => {
        if (!selectedId) return;

        const viewport = viewportRef.current;
        const detail = detailRef.current;

        if (!viewport || !detail) return;

        const byId = new Map(
            graph.nodes.map(node => [node.note.id, node])
        );

        let root = byId.get(selectedId);
        const visited = new Set<string>();

        while (root && root.note.kind !== "idea") {
            if (visited.has(root.note.id)) return;
            visited.add(root.note.id);

            root = root.note.parent_id
                ? byId.get(root.note.parent_id)
                : undefined;
        }

        if (!root) return;

        const rootId = root.note.id;

        // 選択アイデアとその子孫を取得
        const island = graph.nodes.filter(node => {
            if (node.note.id === rootId) return true;

            let parentId = node.note.parent_id;
            const seen = new Set<string>();

            while (parentId && !seen.has(parentId)) {
                if (parentId === rootId) return true;

                seen.add(parentId);
                parentId =
                    byId.get(parentId)?.note.parent_id ?? null;
            }

            return false;
        });

        if (island.length === 0) return;

        const padding = 24;

        const left =
            Math.min(...island.map(n => n.x)) - padding;

        const right =
            Math.max(...island.map(n => n.x + n.width)) + padding;

        const top =
            Math.min(...island.map(n => n.y)) - padding;

        const bottom =
            Math.max(...island.map(n => n.y + n.height)) + padding;

        const width = Math.max(1, right - left);
        const height = Math.max(1, bottom - top);

        const rect = viewport.getBoundingClientRect();
        const detailRect = detail.getBoundingClientRect();

        const margin = 24;

        const panel = {
            left: detailRect.left - rect.left - 12,
            right: detailRect.right - rect.left + 12,
            top: detailRect.top - rect.top - 12,
            bottom: detailRect.bottom - rect.top + 12,
        };

        const overlapsPanel = (
            position: { x: number; y: number },
            scale: number
        ) =>
            position.x + right * scale > panel.left &&
            position.x + left * scale < panel.right &&
            position.y + bottom * scale > panel.top &&
            position.y + top * scale < panel.bottom;

        // すでに島全体が画面内にあり、
        // 詳細パネルとも重なっていなければ何もしない。
        const alreadyVisible =
            pan.x + left * zoom >= margin &&
            pan.x + right * zoom <= viewport.clientWidth - margin &&
            pan.y + top * zoom >= margin &&
            pan.y + bottom * zoom <= viewport.clientHeight - margin &&
            !overlapsPanel(pan, zoom);

        if (alreadyVisible) return;

        type SafeArea = {
            left: number;
            right: number;
            top: number;
            bottom: number;
        };

        // 詳細パネル左側の空き領域
        const leftArea: SafeArea = {
            left: margin,
            right: panel.left - margin,
            top: margin,
            bottom: viewport.clientHeight - margin,
        };

        // 詳細パネル下側の空き領域
        const bottomArea: SafeArea = {
            left: margin,
            right: viewport.clientWidth - margin,
            top: panel.bottom + margin,
            bottom: viewport.clientHeight - margin,
        };

        const calculateView = (area: SafeArea) => {
            const availableWidth = area.right - area.left;
            const availableHeight = area.bottom - area.top;

            if (
                availableWidth <= 0 ||
                availableHeight <= 0
            ) {
                return null;
            }

            const targetZoom = Math.min(
                zoom,
                availableWidth / width,
                availableHeight / height
            );

            if (targetZoom < 0.35) return null;

            // 横方向は空いている領域の中央へ
            const centerX = (left + right) / 2;
            const targetX =
                (area.left + area.right) / 2 -
                centerX * targetZoom;


            // 横方向と同様、縦方向も空き領域の中央へ
            const centerY = (top + bottom) / 2;

            const targetY =
                (area.top + area.bottom) / 2 -
                centerY * targetZoom;


            const nextPan = {
                x: targetX,
                y: targetY,
            };

            if (overlapsPanel(nextPan, targetZoom)) {
                return null;
            }

            return {
                zoom: targetZoom,
                pan: nextPan,
            };
        };

        const leftView = calculateView(leftArea);
        const bottomView = calculateView(bottomArea);


        // 詳細パネルの左側を最優先。
        // 左側に収まらない場合だけ下側を使う。
        const best = leftView ?? bottomView;


        if (!best) return;

        const movement = Math.hypot(
            best.pan.x - pan.x,
            best.pan.y - pan.y
        );

        if (
            movement < 0.5 &&
            Math.abs(best.zoom - zoom) < 0.0001
        ) {
            return;
        }

        setAnimatePan(true);
        setZoom(best.zoom);
        setPan(best.pan);
    }, [selectedId, graph]);



    // 選択中の付箋が所属する親アイデアを特定する
    const selectedIdeaId = useMemo(() => {
        if (!selectedId) return null;

        const byId = new Map(
            graph.nodes.map((node) => [node.note.id, node])
        );

        let current = byId.get(selectedId);
        const visited = new Set<string>();

        while (current && !visited.has(current.note.id)) {
            visited.add(current.note.id);

            if (current.note.kind === "idea") {
                return current.note.id;
            }

            current = current.note.parent_id
                ? byId.get(current.note.parent_id)
                : undefined;
        }

        return null;
    }, [graph, selectedId]);

    // selectedIdとは別に、描画中の島を保持する。
    // 選択解除後も400ms間は描画して収納アニメを再生する。
    const [expandedIdeaId, setExpandedIdeaId] =
        useState<string | null>(null);

    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (selectedIdeaId) {
            setExpandedIdeaId(selectedIdeaId);
            setIsClosing(false);
            return;
        }

        if (!expandedIdeaId) return;

        setIsClosing(true);

        const timeout = window.setTimeout(() => {
            setExpandedIdeaId(null);
            setIsClosing(false);
        }, 400);

        return () => window.clearTimeout(timeout);
    }, [selectedIdeaId, expandedIdeaId]);



    /**
     * 選択中のアイデアに属する付箋だけを
     * 表示するためのグラフ。
     *
     * 通常時：
     *   アイデア本体のみ
     *
     * 選択時：
     *   全アイデア本体
     *   ＋選択アイデアの子付箋
     *   ＋選択アイデア内の接続線
     *
     * 座標は変更しない。
     */
    const visibleGraph = useMemo<BoardGraph>(() => {
        const nodeById = new Map(
            graph.nodes.map((node) => [
                node.note.id,
                node,
            ])
        );

        // 選択された付箋から親アイデアをたどる。
        // 理由・問題点・解決策を選択した場合にも対応。
        const activeIdeaId = expandedIdeaId;

        // アイデア本体は常時表示。
        // 子付箋は、選択されたアイデアの子孫のみ表示。
        const visibleNodes = graph.nodes.filter((node) => {
            if (node.note.kind === "idea") {
                return true;
            }

            if (!activeIdeaId) {
                return false;
            }

            let parentId = node.note.parent_id;

            const visited = new Set<string>();

            while (
                parentId &&
                !visited.has(parentId)
            ) {
                if (parentId === activeIdeaId) {
                    return true;
                }

                visited.add(parentId);

                parentId =
                    nodeById.get(parentId)?.note.parent_id ??
                    null;
            }

            return false;
        });

        const visibleIds = new Set(
            visibleNodes.map((node) => node.note.id)
        );

        // 両端の付箋が表示されている線だけ残す
        const visibleConnections =
            graph.connections.filter(
                (connection) =>
                    visibleIds.has(connection.from.note.id) &&
                    visibleIds.has(connection.to.note.id) &&
                    activeIdeaId !== null
            );


        return {
            nodes: visibleNodes,
            connections: visibleConnections,
            width: graph.width,
            height: graph.height,
        };
    }, [graph, expandedIdeaId]);

    // 現在表示している子付箋だけに接続線を描画する。
    // 構造的・有機的の線の生成方法は変更しない。
    const paths = useMemo(
        () => buildConnectionPaths(
            visibleGraph.connections,
            lineStyle
        ),
        [visibleGraph.connections, lineStyle]
    );


    // 展開中の島に属する付箋を取得する
    const expandedRoot = graph.nodes.find(
        (node) => node.note.id === expandedIdeaId
    );

    const islandNodes = expandedIdeaId
        ? visibleGraph.nodes.filter(
            (node) =>
                node.note.kind !== "idea" ||
                node.note.id === expandedIdeaId
        )
        : [];

    // 子付箋を含む全体を薄い角丸背景で囲む
    const islandBounds =
        expandedRoot && islandNodes.length > 0
            ? (() => {
                const padding = 28;

                const left = Math.min(
                    ...islandNodes.map((node) => node.x)
                ) - padding;

                const top = Math.min(
                    ...islandNodes.map((node) => node.y)
                ) - padding;

                const right = Math.max(
                    ...islandNodes.map(
                        (node) => node.x + node.width
                    )
                ) + padding;

                const bottom = Math.max(
                    ...islandNodes.map(
                        (node) => node.y + node.height
                    )
                ) + padding;

                return {
                    left,
                    top,
                    right,
                    bottom,
                    width: right - left,
                    height: bottom - top,
                };
            })()
            : null;


    const selected = graph.nodes.find(
        (node) => node.note.id === selectedId
    );


    const hovered = graph.nodes.find(
        (node) => node.note.id === hoveredId
    );

    // Escキー・詳細パネル外クリックで閉じる
    useEffect(() => {
        if (selectedId === null) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setSelectedId(null);
            }
        };

        const handleOutsidePointerDown = (event: PointerEvent) => {
            const target = event.target;

            if (!(target instanceof Element)) return;

            // 詳細パネルと付箋の内側では閉じない
            if (
                target.closest("[data-thync-detail]") ||
                target.closest("[data-thync-note]")
            ) {
                return;
            }

            setSelectedId(null);
        };

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener(
            "pointerdown",
            handleOutsidePointerDown
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
            document.removeEventListener(
                "pointerdown",
                handleOutsidePointerDown
            );
        };
    }, [selectedId]);

    const ideaCount = displayNotes.filter(
        (note) => note.kind === "idea"
    ).length;


    const changeZoom = (difference: number) => {
        setZoom((current) =>
            Math.min(1.8, Math.max(0.35, current + difference))
        );
    };



    const resetView = () => {
        setAnimatePan(true);
        setZoom(0.85);
        setPan({ x: 30, y: 10 });
        setSelectedId(null);
    };

    // アイデア付箋すべてが収まる倍率・位置を計算する
    const fitAllIdeas = () => {
        const viewport = viewportRef.current;

        const ideas = graph.nodes.filter(
            (node) => node.note.kind === "idea"
        );

        if (!viewport || ideas.length === 0) return;

        // アイデア付箋だけを対象に外接矩形を計算
        const left = Math.min(...ideas.map((node) => node.x));
        const top = Math.min(...ideas.map((node) => node.y));

        const right = Math.max(
            ...ideas.map((node) => node.x + node.width)
        );

        const bottom = Math.max(
            ...ideas.map((node) => node.y + node.height)
        );

        const contentWidth = Math.max(1, right - left);
        const contentHeight = Math.max(1, bottom - top);

        // 画面の端に余白を確保する
        const padding = 65;

        const availableWidth = Math.max(
            1,
            viewport.clientWidth - padding * 2
        );

        const availableHeight = Math.max(
            1,
            viewport.clientHeight - padding * 2
        );

        // 横幅と高さの両方が収まる倍率
        const fittedZoom = Math.min(
            1,
            availableWidth / contentWidth,
            availableHeight / contentHeight
        );

        // アイデア全体の中心を取得
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;

        // ボードの中心を画面の中心へ合わせる
        const nextPan = {
            x: viewport.clientWidth / 2 - centerX * fittedZoom,
            y: viewport.clientHeight / 2 - centerY * fittedZoom,
        };

        // 選択中の子付箋を閉じて俯瞰表示
        setSelectedId(null);
        setHoveredId(null);

        setAnimatePan(true);
        setZoom(fittedZoom);
        setPan(nextPan);
    };


    // 選択した付箋が左寄りに見えるように視点を移動する

    // 付箋の選択だけを行う。
    // 実際の視点移動は詳細パネル表示後に判定する。
    const focusNote = (node: BoardNode) => {
        setSelectedId(node.note.id);
    };


    const handlePointerDown = (
        event: ReactPointerEvent<HTMLDivElement>
    ) => {
        if (event.button !== 0) return;

        // ボタン操作ではボードをドラッグしない
        if (
            event.target instanceof Element &&
            (
                event.target.closest("button") ||
                event.target.closest("[data-thync-detail]")
            )
        ) {
            return;
        }
        // 自動移動のアニメーションを解除する
        setAnimatePan(false);

        dragRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            panX: pan.x,
            panY: pan.y,
        };

        event.currentTarget.setPointerCapture(event.pointerId);
    };


    const handlePointerMove = (
        event: ReactPointerEvent<HTMLDivElement>
    ) => {
        const drag = dragRef.current;
        if (!drag) return;

        setPan({
            x: drag.panX + event.clientX - drag.startX,
            y: drag.panY + event.clientY - drag.startY,
        });
    };

    const stopDragging = () => {
        dragRef.current = null;
    };

    const proposerName = selected
        ? usingMock
            ? "サンプルユーザー"
            : members.find(
                (member) => member.id === selected.note.proposer_id
            )?.nickname ?? "不明なユーザー"
        : "";


    // 選択付箋が属する親アイデアを取得
    const selectedRoot = (() => {
        if (!selected) return null;

        const byId = new Map(
            displayNotes.map(note => [note.id, note])
        );

        let current: BoardNote | undefined = selected.note;
        const seen = new Set<string>();

        while (current && !seen.has(current.id)) {
            if (current.kind === "idea") return current;

            seen.add(current.id);
            current = current.parent_id
                ? byId.get(current.parent_id)
                : undefined;
        }

        return null;
    })();

    const sourceMessage = selected?.note.source_message_id
        ? messages.find(
            m => m.id === selected.note.source_message_id
        )
        : undefined;

    // 賛否は元発言へのリアクションを集計
    const voteMessageId = selectedRoot?.source_message_id;

    const proCount = reactions.filter(
        r => r.message_id === voteMessageId &&
            r.value === "pro"
    ).length;

    const conCount = reactions.filter(
        r => r.message_id === voteMessageId &&
            r.value === "con"
    ).length;

    // UUIDを番号として使わず、作成日時で順序を求める
    const orderedIdeas = displayNotes
        .filter(note => note.kind === "idea")
        .sort((a, b) => {
            const timeA = a.created_at ?? "";
            const timeB = b.created_at ?? "";
            const order = timeA.localeCompare(timeB);

            return order !== 0
                ? order
                : a.id.localeCompare(b.id);
        });

    const ideaNumber = selectedRoot
        ? orderedIdeas.findIndex(
            idea => idea.id === selectedRoot.id
        ) + 1
        : 0;

    // 類似度の高い他のアイデアを最大3件表示
    const relatedIdeas = (() => {
        if (!selectedRoot?.embedding || usingMock) {
            return [];
        }

        try {
            const base: number[] =
                JSON.parse(selectedRoot.embedding);

            return orderedIdeas
                .filter(
                    idea =>
                        idea.id !== selectedRoot.id &&
                        !!idea.embedding
                )
                .flatMap(idea => {
                    try {
                        const vector: number[] =
                            JSON.parse(idea.embedding!);

                        const score = cosine(base, vector);

                        return [{
                            id: idea.id,
                            label: idea.label,
                            score,
                        }];
                    } catch {
                        return [];
                    }
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);
        } catch {
            return [];
        }
    })();

    const sourceTime = sourceMessage?.created_at ??
        selected?.note.created_at;

    const formattedTime = sourceTime
        ? new Intl.DateTimeFormat("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo",
        }).format(new Date(sourceTime))
        : "日時不明";


    return (
        <section className={styles.board}>
            <header className={styles.toolbar}>
                <div className={styles.heading}>
                    <h2>THYNC</h2>
                    <p>みんなの思考を、ひとつの空間に。</p>
                </div>

                <div className={styles.toolbarRight}>
                    <span className={styles.dataStatus}>
                        <span className={styles.statusDot} />
                        {usingMock ? "モック表示" : "実データ表示"}
                    </span>
                    <span className={styles.counter}>
                        アイデア {ideaCount}件
                    </span>
                </div>
            </header>


            <div
                ref={viewportRef}
                className={styles.viewport}

                style={{
                    // 背景の位置・間隔をボードに同期
                    backgroundPosition: `${pan.x}px ${pan.y}px`,
                    backgroundSize: `${24 * zoom}px ${24 * zoom}px`,

                    // ズームアウト時はドット自体も小さくする
                    backgroundImage: `radial-gradient(
                        circle,
                        var(--thync-border) ${Math.max(0.25, zoom * 0.95)}px,
                        transparent ${Math.max(0.4, zoom * 0.95 + 0.15)}px
                    )`,
                }}

                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={stopDragging}
                onPointerCancel={stopDragging}
            >

                {graph.nodes.length > 0 ? (
                    <div
                        className={styles.world}
                        style={{
                            width: graph.width,
                            height: graph.height,
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            transition: animatePan
                                ? "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)"
                                : "none",
                        }}
                    >


                        {/* 選択中アイデアの関係を囲む島 */}
                        {islandBounds && expandedRoot && (
                            <div
                                className={[
                                    expansionStyles.island,
                                    isClosing
                                        ? expansionStyles.islandClosing
                                        : expansionStyles.islandOpening,
                                ].join(" ")}
                                style={{
                                    left: islandBounds.left,
                                    top: islandBounds.top,
                                    width: islandBounds.width,
                                    height: islandBounds.height,

                                    // アイデア本体から広がるようにする
                                    transformOrigin: `${expandedRoot.x +
                                        expandedRoot.width / 2 -
                                        islandBounds.left
                                        }px ${expandedRoot.y +
                                        expandedRoot.height / 2 -
                                        islandBounds.top
                                        }px`,
                                }}
                                aria-hidden="true"
                            />
                        )}

                        <svg
                            className={[
                                styles.links,
                                expandedIdeaId
                                    ? isClosing
                                        ? expansionStyles.linksClosing
                                        : expansionStyles.linksOpening
                                    : "",
                            ].join(" ")}
                            style={{
                                position: "absolute",
                                zIndex: 3,
                                pointerEvents: "none",
                            }}
                            width={graph.width}
                            height={graph.height}
                            viewBox={`0 0 ${graph.width} ${graph.height}`}
                            aria-hidden="true"
                        >


                            {paths.map((path) => {
                                const active =
                                    selectedId !== null &&
                                    path.relatedIds.includes(selectedId);

                                return (
                                    <path
                                        key={path.key}
                                        d={path.d}
                                        className={
                                            active
                                                ? `${styles.link} ${styles.linkActive}`
                                                : styles.link
                                        }
                                    />
                                );
                            })}

                        </svg>


                        {visibleGraph.nodes.map((node) => {

                            const isSelected =
                                selectedId === node.note.id;

                            const isChild =
                                node.note.kind !== "idea";

                            // 子付箋の件数。賛否の票数とは別。
                            const reasonCount = isChild
                                ? 0
                                : displayNotes.filter(
                                    (note) =>
                                        note.parent_id === node.note.id &&
                                        note.kind === "reason"
                                ).length;

                            const problemCount = isChild
                                ? 0
                                : displayNotes.filter(
                                    (note) =>
                                        note.parent_id === node.note.id &&
                                        note.kind === "problem"
                                ).length;


                            // ほかのアイデア付箋が
                            // 展開中の島と重なっているか
                            const isBehindIsland =
                                !isChild &&
                                expandedIdeaId !== null &&
                                node.note.id !== expandedIdeaId &&
                                islandBounds !== null &&
                                node.x < islandBounds.right &&
                                node.x + node.width > islandBounds.left &&
                                node.y < islandBounds.bottom &&
                                node.y + node.height > islandBounds.top;

                            // 子付箋の縮小中心は、親アイデアの中心
                            const revealOrigin = expandedRoot
                                ? `${expandedRoot.x +
                                expandedRoot.width / 2 -
                                node.x
                                }px ${expandedRoot.y +
                                expandedRoot.height / 2 -
                                node.y
                                }px`
                                : "center";

                            return (
                                <button
                                    key={node.note.id}
                                    type="button"
                                    data-thync-note
                                    className={[
                                        styles.note,
                                        kindClass(node.note.kind),
                                        isSelected ? styles.selected : "",
                                        isChild
                                            ? isClosing
                                                ? expansionStyles.childClosing
                                                : expansionStyles.childOpening
                                            : "",
                                    ].join(" ")}
                                    style={{
                                        left: node.x,
                                        top: node.y,
                                        width: node.width,
                                        height: node.height,
                                        transformOrigin: isChild
                                            ? revealOrigin
                                            : "center",
                                        zIndex: isChild
                                            ? 5
                                            : node.note.id === expandedIdeaId
                                                ? 6
                                                : 1,

                                        opacity: isBehindIsland ? 0.25 : 1,
                                        transition: "opacity 400ms ease, background-color var(--thync-theme-duration) ease-in-out, color var(--thync-theme-duration) ease-in-out, border-color var(--thync-theme-duration) ease-in-out",
                                        overflow: "visible",

                                    }}

                                    onClick={() => focusNote(node)}
                                    onMouseEnter={() => setHoveredId(node.note.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    onFocus={() => setHoveredId(node.note.id)}
                                    onBlur={() => setHoveredId(null)}
                                    aria-pressed={isSelected}
                                    aria-label={`${KIND_LABEL[node.note.kind]}：${node.note.label}`}
                                >
                                    <span
                                        className={styles.noteType}
                                        style={{ opacity: labelOpacity }}
                                    >
                                        {KIND_LABEL[node.note.kind]}
                                    </span>

                                    <span
                                        className={styles.noteText}
                                        style={{
                                            opacity:
                                                isChild ||
                                                    node.note.id === expandedIdeaId
                                                    ? 1
                                                    : labelOpacity,
                                        }}
                                    >
                                        {node.note.label}
                                    </span>


                                    {/* アイデア付箋のコンパクトな件数表示 */}
                                    {!isChild &&
                                        node.note.id !== expandedIdeaId && (
                                            <>
                                                {/* 賛成理由：薄緑の丸バッジ */}
                                                {reasonCount > 0 && (
                                                    <span
                                                        title={`賛成理由 ${reasonCount}件`}
                                                        aria-label={`賛成理由${reasonCount}件`}
                                                        style={{
                                                            position: "absolute",
                                                            left: -10,
                                                            bottom: -17,
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: "50%",
                                                            border: "1px solid #A8E4C6",
                                                            background: "#E9FBF2",
                                                            color: "#358D69",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            fontSize: 15,
                                                            fontWeight: 700,
                                                            lineHeight: 1,
                                                            boxSizing: "border-box",
                                                            pointerEvents: "auto",
                                                            zIndex: 2,
                                                            boxShadow:
                                                                "0 2px 7px rgba(50, 130, 95, 0.06)",
                                                        }}
                                                    >
                                                        {reasonCount}
                                                    </span>
                                                )}

                                                {/* 問題点：左端のみ薄赤の付箋 */}
                                                {problemCount > 0 && (
                                                    <span
                                                        title={`問題点 ${problemCount}件`}
                                                        aria-label={`問題点${problemCount}件`}
                                                        style={{
                                                            position: "absolute",
                                                            right: -12,
                                                            bottom: -14,
                                                            width: 78,
                                                            height: 30,
                                                            borderRadius: 5,
                                                            border: "1px solid #E9B8C5",
                                                            background: "#FFFFFF",
                                                            color: "#B9637D",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            boxSizing: "border-box",
                                                            overflow: "hidden",
                                                            pointerEvents: "auto",
                                                            zIndex: 2,
                                                            boxShadow:
                                                                "3px 3px 0 -1px #F8EBEF, 3px 3px 0 0 #E9B8C5",
                                                        }}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            style={{
                                                                width: 17,
                                                                height: "100%",
                                                                flexShrink: 0,
                                                                background: "#F5C4D0",
                                                                borderRight:
                                                                    "1px solid #E9B8C5",
                                                            }}
                                                        />
                                                        <span
                                                            style={{
                                                                flex: 1,
                                                                textAlign: "center",
                                                                fontSize: 15,
                                                                fontWeight: 700,
                                                                lineHeight: 1,
                                                            }}
                                                        >
                                                            {problemCount}
                                                        </span>
                                                    </span>
                                                )}
                                            </>
                                        )}

                                </button>

                            );
                        })}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>✦</div>
                        <h3>まだアイデアがありません</h3>
                        <p>
                            Talkで意見が分析されると、
                            ここに思考のつながりが現れます。
                        </p>
                    </div>
                )}


                {/* 縮小表示中の付箋ホバーポップアップ */}
                {hovered && zoom < 0.6 && (
                    <div
                        className={styles.noteTooltip}
                        style={{
                            left: Math.max(
                                12,
                                Math.min(
                                    (viewportRef.current?.clientWidth ?? 600) - 272,
                                    pan.x + (hovered.x + hovered.width) * zoom + 12
                                )
                            ),
                            top: Math.max(
                                12,
                                Math.min(
                                    (viewportRef.current?.clientHeight ?? 500) - 110,
                                    pan.y + hovered.y * zoom
                                )
                            ),
                        }}
                        role="tooltip"
                    >
                        <span className={styles.tooltipKind}>
                            {KIND_LABEL[hovered.note.kind]}
                        </span>
                        <span className={styles.tooltipText}>
                            {hovered.note.label}
                        </span>
                    </div>
                )}


                <div className={styles.controls}>
                    <button
                        type="button"
                        className={styles.resetButton}
                        onClick={fitAllIdeas}
                        title="すべてのアイデアを画面内に表示"
                    >
                        全体表示
                    </button>

                    <button
                        type="button"
                        onClick={() => changeZoom(-0.15)}
                        aria-label="縮小"
                        title="縮小"
                    >
                        −
                    </button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button
                        type="button"
                        onClick={() => changeZoom(0.15)}
                        aria-label="拡大"
                        title="拡大"
                    >
                        ＋
                    </button>
                    <button
                        type="button"
                        className={styles.resetButton}
                        onClick={resetView}
                        title="表示位置をリセット"
                    >
                        リセット
                    </button>
                </div>


                {selected && (
                    <aside
                        ref={detailRef}
                        className={styles.detail}
                        data-thync-detail
                    >
                        <div className={styles.detailHeader}>
                            <span>{KIND_LABEL[selected.note.kind]}</span>
                            <button
                                type="button"
                                onClick={() => setSelectedId(null)}
                                aria-label="詳細を閉じる"
                            >
                                ×
                            </button>
                        </div>

                        <p className={styles.detailTitle}>
                            {selected.note.label}
                        </p>

                        <div className={styles.detailSmallMeta}>
                            {ideaNumber > 0 && (
                                <span>第{ideaNumber}案</span>
                            )}
                            <span>発言者：{proposerName}</span>
                            <span>{formattedTime}</span>
                        </div>

                        {selectedRoot && !usingMock && (
                            <div className={styles.detailVotes}>
                                <div className={styles.detailVote}>
                                    <span>賛成</span>
                                    <strong>{proCount}</strong>
                                </div>
                                <div className={styles.detailVote}>
                                    <span>反対</span>
                                    <strong>{conCount}</strong>
                                </div>
                            </div>
                        )}

                        <div className={styles.detailSection}>
                            <div className={styles.detailSectionTitle}>
                                元発言
                            </div>

                            <p className={styles.detailQuote}>
                                {sourceMessage?.body ??
                                    (usingMock
                                        ? "モックデータ"
                                        : "元発言を取得できません")}
                            </p>

                            <button
                                type="button"
                                className={styles.detailJumpButton}
                                disabled={!sourceMessage}
                                onClick={() => {
                                    if (sourceMessage) {
                                        onJumpToMessage(sourceMessage.id);
                                    }
                                }}
                            >
                                Talkで元発言を見る ↗
                            </button>
                        </div>

                        {relatedIdeas.length > 0 && (
                            <div className={styles.detailSection}>
                                <div className={styles.detailSectionTitle}>
                                    関連するアイデア
                                </div>

                                <div className={styles.detailRelatedList}>
                                    {relatedIdeas.map(idea => (
                                        <button
                                            key={idea.id}
                                            type="button"
                                            className={styles.detailRelatedButton}
                                            onClick={() => {
                                                setSelectedId(idea.id);
                                                setHoveredId(null);
                                            }}
                                        >
                                            <span>{idea.label}</span>
                                        </button>
                                    ))}
                                </div>

                            </div>
                        )}
                    </aside>
                )}


                <div className={styles.hint}>
                    ドラッグ・2本指スクロールで移動
                    {" · "}
                    ピンチで拡大縮小
                    {" · "}
                    付箋クリックで詳細
                </div>
            </div>
        </section>
    );
}
