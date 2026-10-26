// 子の配置　担当：森
// 問題点は案の下、解決案は問題点の横。親からの相対位置を返す（保存しない）

// index は兄弟の中で何番目か（0始まり）
export function placeChild(kind: 'problem' | 'solution', index: number): { dx: number; dy: number } {
  // 未実装の間の仮の値
  return kind === 'problem' ? { dx: 0, dy: 120 + index * 100 } : { dx: 200 + index * 180, dy: 0 };
}
