'use client';
// AIの気づきを取ってくる（岩崎）
// まとめタブを開いている間だけ、付箋の顔ぶれが変わったときに1回取り直す。
// 同じ付箋のままタブを開き直しても、Gemini は呼ばない
import { useEffect, useRef, useState } from 'react';
import type { Note } from '@/types/rows';

export type Insight = { text: string; ideaIds: string[] };   // ideaIds は notes.id

export function useInsights(roomId: string, notes: Note[], enabled: boolean) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedFor = useRef<string | null>(null);   // 最後に取った付箋の顔ぶれ

  // 付箋の顔ぶれ（増えた・消えたが分かればいい）
  const signature = notes.map((n) => n.id).sort().join(',');
  const ideaCount = notes.filter((n) => n.kind === 'idea').length;

  useEffect(() => {
    if (!enabled || fetchedFor.current === signature) return;

    // 案が2つ未満なら関係を見つけようがないので、呼ばない
    if (ideaCount < 2) {
      fetchedFor.current = signature;
      setInsights([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { insights: Insight[] }) => {
        fetchedFor.current = signature;
        setInsights(data.insights);
      })
      .catch((e) => {
        // 付箋が変わって取り直しになった（中断）ときは何もしない。それ以外は前の気づきを残す
        if (e.name !== 'AbortError') console.warn('気づきの取得に失敗', e);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [enabled, signature, ideaCount, roomId]);

  return { insights, loading };
}
