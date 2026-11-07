
import { cosine } from "@/lib/layout/similarity";

export type IdeaLayoutInput = {
    id: string;
    x: number;
    y: number;
    embedding: string | null;
};

type Point = {
    x: number;
    y: number;
};

function parseVector(value: string | null): number[] | null {
    if (!value) return null;

    try {
        const parsed: unknown = JSON.parse(value);

        if (
            !Array.isArray(parsed) ||
            parsed.length === 0 ||
            !parsed.every(
                (v) => typeof v === "number" && Number.isFinite(v)
            )
        ) {
            return null;
        }

        return parsed as number[];
    } catch {
        return null;
    }
}

function dot(a: number[], b: number[]): number {
    return a.reduce((sum, value, i) => sum + value * b[i], 0);
}

function normalize(v: number[]): number[] | null {
    const length = Math.hypot(...v);
    if (length < 1e-12) return null;
    return v.map((x) => x / length);
}

/**
 * 対称行列の大きな固有値に対応する固有ベクトルを求める。
 * 上位2次元を取り出すための反復計算。
 */
function eigenvector(
    matrix: number[][],
    seed: number,
    previous?: number[]
): { vector: number[]; eigenvalue: number } {
    const n = matrix.length;

    let v = Array.from(
        { length: n },
        (_, i) =>
            Math.sin((i + 1) * (seed + 1) * 1.731) +
            Math.cos((i + 1) * (seed + 2) * 0.917)
    );

    const orthogonalize = (values: number[]) => {
        const mean =
            values.reduce((sum, x) => sum + x, 0) / n;

        let result = values.map((x) => x - mean);

        if (previous) {
            const projection = dot(result, previous);
            result = result.map(
                (x, i) => x - projection * previous[i]
            );
        }

        return result;
    };

    v = normalize(orthogonalize(v)) ??
        Array.from({ length: n }, () => 0);

    for (let iteration = 0; iteration < 150; iteration++) {
        const next = matrix.map((row) => dot(row, v));
        const normalized = normalize(orthogonalize(next));

        if (!normalized) break;
        v = normalized;
    }

    const mv = matrix.map((row) => dot(row, v));
    const eigenvalue = Math.max(0, dot(v, mv));

    return { vector: v, eigenvalue };
}

/**
 * コサイン類似度から古典的MDSの2次元配置を求める。
 *
 * 1. 全アイデア間のコサイン類似度を計算
 * 2. 中心化したGram行列を作る
 * 3. 上位2固有ベクトルから2次元座標を作る
 * 4. 重なる場合だけ全体を相似拡大
 *
 * DBへの書き込みは行わない。
 */
export function layoutBySimilarity(
    ideas: readonly IdeaLayoutInput[]
): Map<string, Point> {
    const result = new Map<string, Point>();
    const n = ideas.length;

    if (n === 0) return result;

    const vectors = ideas.map((idea) =>
        parseVector(idea.embedding)
    );

    const valid =
        vectors.every((v) => v !== null) &&
        vectors.every((v) => v!.length === vectors[0]!.length);

    // Embeddingが不足している場合はDB座標を利用する。
    if (!valid || n === 1) {
        const xs = ideas.map((idea) => idea.x);
        const ys = ideas.map((idea) => idea.y);

        const minX = Math.min(...xs);
        const minY = Math.min(...ys);

        ideas.forEach((idea) => {
            result.set(idea.id, {
                x: idea.x - minX + 85,
                y: idea.y - minY + 140,
            });
        });

        return result;
    }

    // ① コサイン類似度行列
    const similarity = Array.from(
        { length: n },
        (_, i) =>
            Array.from(
                { length: n },
                (_, j) =>
                    i === j
                        ? 1
                        : cosine(vectors[i]!, vectors[j]!)
            )
    );

    // ② 二重中心化
    // 単位ベクトル間の距離のMDSでは、
    // 中心化したコサイン類似度行列がGram行列になる。
    const rowMean = similarity.map(
        (row) =>
            row.reduce((sum, x) => sum + x, 0) / n
    );

    const totalMean =
        rowMean.reduce((sum, x) => sum + x, 0) / n;

    const gram = similarity.map((row, i) =>
        row.map(
            (value, j) =>
                value - rowMean[i] - rowMean[j] + totalMean
        )
    );

    // ③ 上位2主軸を求める
    const first = eigenvector(gram, 1);
    const second = eigenvector(gram, 2, first.vector);

    const points: Point[] = ideas.map((_, i) => ({
        x: first.vector[i] * Math.sqrt(first.eigenvalue),
        y: second.vector[i] * Math.sqrt(second.eigenvalue),
    }));


    // ④ MDSの座標を画面上の大きさに変換
    // この時点では付箋を個別に動かさない。
    const minRawX = Math.min(...points.map(p => p.x));
    const maxRawX = Math.max(...points.map(p => p.x));
    const minRawY = Math.min(...points.map(p => p.y));
    const maxRawY = Math.max(...points.map(p => p.y));

    const rawExtent = Math.max(
        maxRawX - minRawX,
        maxRawY - minRawY
    );

    // MDSの無次元座標をピクセルへ変換する基準倍率
    const baseScale =
        rawExtent > 1e-8 ? 680 / rawExtent : 1;

    const basePoints = points.map(p => ({
        x: p.x * baseScale,
        y: p.y * baseScale,
    }));

    const adjusted = basePoints.map(p => ({ ...p }));

    // ⑤ 付箋の重なりを、局所的な移動で解消する
    // 各付箋はMDSの元座標から最大90pxまで。
    const REQUIRED_X = 255;
    const REQUIRED_Y = 132;
    const MAX_NUDGE = 90;
    const MAX_STEP = 20;

    const clampToBudget = (index: number) => {
        const original = basePoints[index];
        const current = adjusted[index];

        const dx = current.x - original.x;
        const dy = current.y - original.y;
        const length = Math.hypot(dx, dy);

        if (length > MAX_NUDGE) {
            const ratio = MAX_NUDGE / length;

            current.x = original.x + dx * ratio;
            current.y = original.y + dy * ratio;
        }
    };

    for (let iteration = 0; iteration < 30; iteration++) {
        let foundOverlap = false;
        let moved = false;

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const a = adjusted[i];
                const b = adjusted[j];

                const dx = b.x - a.x;
                const dy = b.y - a.y;

                const overlapX =
                    REQUIRED_X - Math.abs(dx);
                const overlapY =
                    REQUIRED_Y - Math.abs(dy);

                // 横か縦のどちらかが十分離れていればOK
                if (overlapX <= 0 || overlapY <= 0) {
                    continue;
                }

                foundOverlap = true;

                // より少ない移動量で解消できる方向を選ぶ
                const axis =
                    overlapX <= overlapY ? "x" : "y";

                const delta = axis === "x" ? dx : dy;
                const overlap =
                    axis === "x" ? overlapX : overlapY;

                const direction =
                    Math.abs(delta) > 1e-9
                        ? Math.sign(delta)
                        : (i + j) % 2 === 0 ? 1 : -1;

                const shift =
                    Math.min(MAX_STEP, overlap + 1) / 2;

                const beforeAX = a.x;
                const beforeAY = a.y;
                const beforeBX = b.x;
                const beforeBY = b.y;

                if (axis === "x") {
                    a.x -= direction * shift;
                    b.x += direction * shift;
                } else {
                    a.y -= direction * shift;
                    b.y += direction * shift;
                }

                clampToBudget(i);
                clampToBudget(j);

                if (
                    Math.abs(a.x - beforeAX) > 1e-6 ||
                    Math.abs(a.y - beforeAY) > 1e-6 ||
                    Math.abs(b.x - beforeBX) > 1e-6 ||
                    Math.abs(b.y - beforeBY) > 1e-6
                ) {
                    moved = true;
                }
            }
        }

        if (!foundOverlap || !moved) break;
    }

    // ⑥ それでも重なっていた場合のみ相似拡大
    // 個別移動はここから先、行わない。
    let finalScale = 1;

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const dx = Math.abs(
                adjusted[i].x - adjusted[j].x
            );
            const dy = Math.abs(
                adjusted[i].y - adjusted[j].y
            );

            const scaleX =
                REQUIRED_X / Math.max(dx, 1e-9);

            const scaleY =
                REQUIRED_Y / Math.max(dy, 1e-9);

            const required = Math.min(scaleX, scaleY);

            finalScale = Math.max(finalScale, required);
        }
    }

    // 浮動小数点誤差による接触を避ける
    if (finalScale > 1) {
        finalScale *= 1.001;
    }

    // ⑦ 全体の相似拡大と平行移動
    const scaled = adjusted.map(p => ({
        x: p.x * finalScale,
        y: p.y * finalScale,
    }));

    const minX = Math.min(...scaled.map(p => p.x));
    const minY = Math.min(...scaled.map(p => p.y));

    ideas.forEach((idea, i) => {
        result.set(idea.id, {
            x: Math.round(scaled[i].x - minX + 85),
            y: Math.round(scaled[i].y - minY + 140),
        });
    });

    // 一時的な検証ログ
    if (process.env.NODE_ENV === "development") {
        console.info("[THYNC MDS layout]", {
            ideas: n,
            baseScale: Number(baseScale.toFixed(2)),
            finalScale: Number(finalScale.toFixed(3)),
            maximumNudge: MAX_NUDGE,
        });
    }

    return result;

}
