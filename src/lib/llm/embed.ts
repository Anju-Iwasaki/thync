// ラベルのベクトル化  担当：楠奥

// 未実装の間は、配置が動くように固定長のダミーを返す
export async function embed(label: string): Promise<number[]> {
  return Array.from({ length: 8 }, (_, i) => ((label.charCodeAt(i % label.length) || 0) % 7) / 7);
}
