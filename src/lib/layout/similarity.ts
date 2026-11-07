
/**
 * 2つのEmbeddingベクトルのコサイン類似度を計算する。
 *
 * 戻り値：
 *   1   : 同じ方向
 *   0   : 直交
 *  -1   : 逆方向
 *
 * ※ 類似度が低いことは、意見の対立を意味しない。
 */
export function cosine(
  a: number[],
  b: number[]
): number {
  if (a.length === 0 || b.length === 0) {
    throw new Error(
      "コサイン類似度: 空のベクトルです"
    );
  }

  if (a.length !== b.length) {
    throw new Error(
      "コサイン類似度: ベクトルの次元数が一致しません"
    );
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(
        "コサイン類似度: 不正な数値が含まれています"
      );
    }

    dot += x * y;
    normA += x * x;
    normB += y * y;
  }

  if (normA === 0 || normB === 0) {
    throw new Error(
      "コサイン類似度: 零ベクトルは計算できません"
    );
  }

  const result =
    dot / (Math.sqrt(normA) * Math.sqrt(normB));

  // 浮動小数点誤差を補正
  return Math.max(-1, Math.min(1, result));
}
