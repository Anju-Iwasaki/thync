
import { cosine } from "./similarity";

export type PlacedIdea = {
  x: number;
  y: number;
  embedding: number[];
};

// 配置計算の基準値（DB上のボード座標）
const MIN_DISTANCE = 300;

// 候補位置を探索する半径
const SEARCH_RADII = [
  330, 470, 620, 800, 1000,
  1250, 1550, 1900, 2300,
];

// 各半径で試す方向の数
const ANGLE_STEPS = 32;

// 全座標を整数に揃える
function point(
  x: number,
  y: number
): { x: number; y: number } {
  return {
    x: Math.round(x),
    y: Math.round(y),
  };
}

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.hypot(
    a.x - b.x,
    a.y - b.y
  );
}

// 既存のアイデアに近すぎないか判定
function hasCollision(
  candidate: { x: number; y: number },
  existing: readonly PlacedIdea[]
): boolean {
  return existing.some(
    (idea) =>
      distance(candidate, idea) < MIN_DISTANCE
  );
}

// 比較可能なEmbeddingだけ類似度を計算
function similarityOrNull(
  a: number[],
  b: number[]
): number | null {
  if (
    a.length === 0 ||
    a.length !== b.length
  ) {
    return null;
  }

  try {
    return cosine(a, b);
  } catch {
    return null;
  }
}

/**
 * 新規アイデアの配置先を決める。
 *
 * 原則：
 * 1. 最初のアイデアは原点
 * 2. 意味の近いアイデアを基準にする
 * 3. 2番目に近いアイデアの方向も考慮する
 * 4. 既存アイデアと重ならない位置を探索する
 * 5. 既存座標は変更しない
 *
 * 現段階ではscaleは変更しない。
 */
export function placeIdea(
  existing: PlacedIdea[],
  newEmbedding: number[],
  scale: number
): { x: number; y: number; scale: number } {

  // 最初のアイデア
  if (existing.length === 0) {
    return {
      x: 0,
      y: 0,
      scale,
    };
  }

  // 既存案の座標が正常であることを確認
  const validExisting = existing.filter(
    (idea) =>
      Number.isFinite(idea.x) &&
      Number.isFinite(idea.y)
  );

  if (validExisting.length === 0) {
    return {
      x: 0,
      y: 0,
      scale,
    };
  }

  // 新規Embeddingとの類似度
  const ranked = validExisting
    .map((idea) => ({
      idea,
      similarity: similarityOrNull(
        idea.embedding,
        newEmbedding
      ),
    }))
    .filter(
      (item): item is {
        idea: PlacedIdea;
        similarity: number;
      } => item.similarity !== null
    )
    .sort(
      (a, b) =>
        b.similarity - a.similarity
    );

  // 有効なEmbeddingがある場合は最も似た案を基準にする。
  // ない場合は最初の既存案を基準とする。
  const nearest =
    ranked[0]?.idea ?? validExisting[0];

  const second =
    ranked[1]?.idea ?? null;

  // どの案とも近くない場合は原点周辺で探索する
  const hasSimilarIdea =
    ranked.length > 0 &&
    ranked[0].similarity >= 0.35;

  // 探索の中心
  const center = hasSimilarIdea
    ? {
      x: nearest.x,
      y: nearest.y,
    }
    : { x: 0, y: 0 };

  // 2番目に似ている案の方向を優先
  let baseAngle = -Math.PI / 2;

  if (hasSimilarIdea && second) {
    const dx =
      second.x - nearest.x;
    const dy =
      second.y - nearest.y;

    if (Math.hypot(dx, dy) > 0.001) {
      baseAngle = Math.atan2(dy, dx);
    }
  }

  let best:
    | {
      x: number;
      y: number;
      score: number;
    }
    | null = null;

  // 候補を半径・角度の組み合わせで生成
  for (const radius of SEARCH_RADII) {
    for (let i = 0; i < ANGLE_STEPS; i++) {

      const angle =
        baseAngle +
        (2 * Math.PI * i) / ANGLE_STEPS;

      const candidate = point(
        center.x + radius * Math.cos(angle),
        center.y + radius * Math.sin(angle)
      );

      // 既存案との衝突を回避
      if (
        hasCollision(
          candidate,
          validExisting
        )
      ) {
        continue;
      }

      // 最も似た案からの距離
      const nearestDistance =
        distance(candidate, nearest);

      // 2番目に似た案からの距離
      const secondDistance =
        second
          ? distance(candidate, second)
          : 0;

      // ボード原点からの距離
      const centerDistance =
        Math.hypot(
          candidate.x,
          candidate.y
        );

      // 候補の評価関数
      // 最も似た案との近さを最優先。
      // 次に2番目に似た案への近さ。
      // 最後にボードが過度に広がらないこと。
      const score = hasSimilarIdea
        ? nearestDistance +
        secondDistance * 0.24 +
        centerDistance * 0.06
        : centerDistance;

      if (
        best === null ||
        score < best.score
      ) {
        best = {
          ...candidate,
          score,
        };
      }
    }

    // 最短の利用可能半径で配置する。
    // これによってボードの過度な拡大を抑える。
    if (best !== null) {
      break;
    }
  }

  if (best !== null) {
    return {
      x: best.x,
      y: best.y,
      scale,
    };
  }

  // 通常の探索範囲がすべて埋まった場合。
  // 既存案の外側に配置する安全なフォールバック。
  const maxRadius = Math.max(
    ...validExisting.map((idea) =>
      Math.hypot(idea.x, idea.y)
    )
  );

  const fallbackRadius =
    maxRadius + MIN_DISTANCE + 100;

  return {
    x: Math.round(fallbackRadius),
    y: 0,
    scale,
  };
}
