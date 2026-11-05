
"use client";

import { useState } from "react";
import styles from "./RoomHeader.module.css";

type RoomHeaderProps = {
    title: string;
    memberCount: number;

    // 外部のルーム取得処理から渡す共有URL
    shareUrl?: string | null;
};

export default function RoomHeader({
    title,
    memberCount,
    shareUrl = null,
}: RoomHeaderProps) {
    const [urlVisible, setUrlVisible] = useState(false);
    const [notice, setNotice] = useState("");

    const handleCopy = async () => {
        if (!shareUrl) return;

        try {
            await navigator.clipboard.writeText(shareUrl);
            setNotice("コピーしました");
        } catch {
            setNotice("コピーできませんでした");
        }
    };

    return (
        <div className={styles.headerContent}>
            <div className={styles.topic}>
                <span className={styles.topicTitle} title={title}>
                    {title}
                </span>

                <span
                    className={styles.memberCount}
                    aria-label={`参加人数 ${memberCount}人`}
                >
                    {memberCount}人
                </span>
            </div>

            <div className={styles.shareArea}>
                {shareUrl ? (
                    <>
                        <button
                            type="button"
                            className={styles.urlToggle}
                            onClick={() => {
                                setUrlVisible((previous) => !previous);
                                setNotice("");
                            }}
                            aria-expanded={urlVisible}
                            aria-label={
                                urlVisible
                                    ? "共有URLを隠す"
                                    : "共有URLを表示"
                            }
                        >
                            <span aria-hidden="true">
                                {urlVisible ? "▾" : "▸"}
                            </span>
                            URL
                        </button>

                        {urlVisible && (
                            <span
                                className={styles.urlText}
                                title={shareUrl}
                            >
                                {shareUrl}
                            </span>
                        )}

                        <button
                            type="button"
                            className={styles.copyButton}
                            onClick={() => {
                                void handleCopy();
                            }}
                            title="共有URLをコピー"
                            aria-label="共有URLをコピー"
                        >
                            <svg
                                width="17"
                                height="17"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <rect
                                    x="8"
                                    y="8"
                                    width="12"
                                    height="12"
                                    rx="2"
                                />
                                <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                            </svg>
                        </button>
                    </>
                ) : (
                    <span className={styles.urlUnavailable}>
                        共有URL未設定
                    </span>
                )}

                {notice && (
                    <span
                        className={styles.notice}
                        role="status"
                    >
                        {notice}
                    </span>
                )}
            </div>
        </div>
    );
}
