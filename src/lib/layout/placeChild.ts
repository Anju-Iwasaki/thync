
// 子付箋の相対配置
// UIと配置処理で同じ基準値を使う。

export type ChildKind = "problem" | "solution";

export type ChildOffset = {
  dx: number;
  dy: number;
};

export function placeChild(
  kind: ChildKind,
  index: number
): ChildOffset {
  const order = Math.max(0, Math.floor(index));

  if (kind === "problem") {
    // アイデアの右側に問題点を並べる
    return {
      dx: 485,
      dy: 200 + order * 150,
    };
  }

  // 解決策は問題点の右下に配置する。
  // 解決策が増えても重ならない間隔を確保する。
  return {
    dx: 95,
    dy: 170 + order * 142,
  };
}
