
import {
    placeIdea,
    type PlacedIdea,
} from "@/lib/layout/placeIdea";

/**
 * 配置検証用の仮Embedding。
 * 実際のGemini出力ではない。
 */
const MOCK_VECTORS: Record<string, number[]> = {
    i1: [1.00, 0.00, 0.00, 0.00],
    i2: [0.96, 0.16, 0.04, 0.00],
    i3: [0.98, 0.08, 0.02, 0.00],
    i4: [0.00, 1.00, 0.00, 0.00],
    i5: [0.08, 0.98, 0.00, 0.00],
    i6: [0.00, 0.00, 0.92, 0.10],
    i7: [0.00, 0.00, 0.05, 1.00],
    i8: [0.00, 0.00, 1.00, 0.04],
    i9: [0.18, 0.00, 0.00, 0.96],
    i10: [0.00, 0.05, 0.99, 0.00],
};

export type MockIsland = {
    id: string;
    height: number;
};

type Position = {
    x: number;
    y: number;
};

type Rect = Position & {
    width: number;
    height: number;
};

/**
 * コンパクト表示ではアイデア本体の大きさを
 * 基準に配置する。
 *
 * 選択時の子付箋はこの領域の外まで
 * 展開できるものとする。
 */
const CARD_WIDTH = 235;
const CARD_HEIGHT = 112;

const GAP_X = 115;
const GAP_Y = 95;

const POSITION_SCALE = 0.85;
const SEARCH_STEP = 90;
const ANGLE_STEPS = 32;
const MAX_RINGS = 80;

function collision(
    candidate: Position,
    existing: readonly Rect[]
): boolean {
    return existing.some((rect) => {
        const left = candidate.x;
        const right = left + CARD_WIDTH;
        const top = candidate.y;
        const bottom = top + CARD_HEIGHT;

        return (
            left < rect.x + rect.width + GAP_X &&
            right + GAP_X > rect.x &&
            top < rect.y + rect.height + GAP_Y &&
            bottom + GAP_Y > rect.y
        );
    });
}

/**
 * 希望位置の近くから、アイデア本体が
 * 重ならない空き位置を探す。
 */
function findPosition(
    preferred: Position,
    occupied: readonly Rect[]
): Position {
    if (!collision(preferred, occupied)) {
        return preferred;
    }

    for (let ring = 1; ring <= MAX_RINGS; ring++) {
        const radius = ring * SEARCH_STEP;

        let best: Position | null = null;
        let bestScore = Infinity;

        for (let i = 0; i < ANGLE_STEPS; i++) {
            const angle =
                (i * 2 * Math.PI) / ANGLE_STEPS;

            const candidate = {
                x: Math.round(
                    preferred.x + Math.cos(angle) * radius
                ),
                y: Math.round(
                    preferred.y + Math.sin(angle) * radius
                ),
            };

            if (collision(candidate, occupied)) {
                continue;
            }

            // 希望位置との近さと、中心からの広がりを考慮
            const score =
                Math.hypot(
                    candidate.x - preferred.x,
                    candidate.y - preferred.y
                ) +
                Math.hypot(
                    candidate.x,
                    candidate.y
                ) * 0.06;

            if (score < bestScore) {
                best = candidate;
                bestScore = score;
            }
        }

        if (best) {
            return best;
        }
    }

    // 候補探索が失敗した場合も重なりを避ける
    const rightEdge = occupied.reduce(
        (max, rect) =>
            Math.max(max, rect.x + rect.width),
        0
    );

    return {
        x: rightEdge + GAP_X,
        y: 0,
    };
}

/**
 * 意味の近いアイデアを近くに配置する。
 *
 * ・既存のplaceIdea()を利用
 * ・表示上はアイデア本体だけ衝突判定
 * ・既存のアイデアは再配置しない
 * ・子付箋の高さは配置の制約に使わない
 */
export function placeMockIdeas(
    islands: readonly MockIsland[]
): Map<string, Position> {
    const placedIdeas: PlacedIdea[] = [];
    const occupied: Rect[] = [];
    const positions = new Map<string, Position>();

    for (const island of islands) {
        const embedding =
            MOCK_VECTORS[island.id] ??
            [0.25, 0.25, 0.25, 0.25];

        const suggested = placeIdea(
            placedIdeas,
            embedding,
            1
        );

        const preferred: Position = {
            x: Math.round(
                suggested.x * POSITION_SCALE
            ),
            y: Math.round(
                suggested.y * POSITION_SCALE
            ),
        };

        const position = findPosition(
            preferred,
            occupied
        );

        occupied.push({
            ...position,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
        });

        positions.set(island.id, position);

        // 次の配置は実際に確保した位置を基準にする。
        // POSITION_SCALEとの座標変換を戻して保存する。
        placedIdeas.push({
            x: position.x / POSITION_SCALE,
            y: position.y / POSITION_SCALE,
            embedding,
        });
    }

    // 画面上で負座標にならないよう、全体を平行移動
    const minX = Math.min(
        0,
        ...occupied.map((rect) => rect.x)
    );

    const minY = Math.min(
        0,
        ...occupied.map((rect) => rect.y)
    );

    for (const [id, position] of positions) {
        positions.set(id, {
            x: position.x - minX + 85,
            y: position.y - minY + 140,
        });
    }

    return positions;
}
