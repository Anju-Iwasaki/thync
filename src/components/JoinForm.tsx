'use client';
// 参加画面  担当：大槻
// ニックネームを入れてonJoinを呼ぶだけ。参加の書き込みは入れ物（RoomShell）が行う
import { useState } from 'react';

export type JoinFormProps = {
  topic: string;                                // 部屋の議題
  onJoin: (nickname: string) => Promise<void>;  // 失敗すると例外を投げる
};

export default function JoinForm({ topic, onJoin }: JoinFormProps) {
  // ここから大書き直してよい（今は最低限動く形）
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  return (
    <main style={{ padding: 16 }}>
      <h1>{topic}</h1>
      <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="ニックネーム" />
      <button
        onClick={() => onJoin(nickname.trim()).catch((e) => setError(e instanceof Error ? e.message : JSON.stringify(e)))}
        disabled={!nickname.trim()}
      >
        参加
      </button>
      <pre>{error}</pre>
    </main>
  );
}
