// 案の配置　担当：森

export type PlacedIdea = { x: number; y: number; embedding: number[] };

// x, y は拡大前の座標。scale は配置後のボード全体の倍率（変わらなければ入力と同じ値）
export function placeIdea(
  existing: PlacedIdea[],
  newEmbedding: number[],
  scale: number
): { x: number; y: number; scale: number } {
  // 未実装の間は横一列に並べる
  return { x: existing.length * 220, y: 0, scale };
}
