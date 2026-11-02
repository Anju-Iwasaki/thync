
"use client";

import { useState } from "react";
import JoinForm from "../../components/JoinForm";

export default function JoinPreviewPage() {
    const [joinedNickname, setJoinedNickname] =
        useState<string | null>(null);

    if (joinedNickname) {
        return (
            <main
                style={{
                    minHeight: "100dvh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 16,
                    padding: 24,
                    textAlign: "center",
                    background: "#f8f9fa",
                    color: "#202124",
                }}
            >
                <h1 style={{ margin: 0 }}>
                    参加フォームの確認完了
                </h1>

                <p>
                    {joinedNickname} さんの参加操作を受け付けました。
                </p>

                <p
                    style={{
                        maxWidth: 400,
                        fontSize: 13,
                        color: "#666",
                    }}
                >
                    これはUI確認用です。
                    実際のグループ登録は行っていません。
                </p>

                <button
                    type="button"
                    onClick={() => setJoinedNickname(null)}
                    style={{
                        padding: "12px 20px",
                        borderRadius: 10,
                        border: "1px solid #ccc",
                        background: "#fff",
                        cursor: "pointer",
                    }}
                >
                    入力画面に戻る
                </button>
            </main>
        );
    }

    return (
        <JoinForm
            roomId="preview-room-1"
            topic="技育CAMPの企画について"
            onJoin={async (_roomId, nickname) => {
                setJoinedNickname(nickname);
            }}
        />
    );
}
