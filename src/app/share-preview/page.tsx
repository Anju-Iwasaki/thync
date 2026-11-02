
"use client";

import RoomHeader from "../../components/layout/RoomHeader";
import "../../styles/theme.css";

export default function SharePreviewPage() {
    return (
        <div
            className="thync-shell"
            data-theme="light"
            style={{
                minHeight: "100dvh",
                padding: "24px",
                background: "var(--thync-bg)",
            }}
        >
            <RoomHeader
                title="技育CAMPの企画について"
                memberCount={5}
                shareUrl="https://example.com/room/demo"
            />

            <p
                style={{
                    marginTop: 24,
                    fontSize: 12,
                    color: "var(--thync-text-muted)",
                }}
            >
                このURLは表示・コピー確認専用のダミーです。
                実際のTHYNCルームには参加できません。
            </p>
        </div>
    );
}
