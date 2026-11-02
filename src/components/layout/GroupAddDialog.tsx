
"use client";

import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from "react";
import styles from "./GroupAddDialog.module.css";

export type GroupAddRequest =
    | {
        mode: "create";
        topic: string;
        nickname: string;
    }
    | {
        mode: "join";
        url: string;
        nickname: string;
    };

type GroupAddDialogProps = {
    onClose: () => void;
    onSubmit?: (
        request: GroupAddRequest
    ) => void | Promise<void>;
};

export default function GroupAddDialog({
    onClose,
    onSubmit,
}: GroupAddDialogProps) {
    const [mode, setMode] = useState<"create" | "join">(
        "create"
    );
    const [topic, setTopic] = useState("");
    const [url, setUrl] = useState("");
    const [nickname, setNickname] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // 入力後、ユーザーの最終確認を待つデータ
    const [pendingRequest, setPendingRequest] =
        useState<GroupAddRequest | null>(null);

    // UIプレビューで確定操作まで確認するための状態
    const [previewCompleted, setPreviewCompleted] =
        useState(false);

    const [error, setError] = useState<string | null>(null);


    const dialogRef = useRef<HTMLDivElement>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        firstInputRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [onClose]);

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (submitting) return;

        const name = nickname.trim();

        if (!name) return;

        let request: GroupAddRequest;

        if (mode === "create") {
            const title = topic.trim();
            if (!title) return;

            request = {
                mode: "create",
                topic: title,
                nickname: name,
            };
        } else {
            const inputUrl = url.trim();

            try {
                const parsed = new URL(inputUrl);

                if (
                    parsed.protocol !== "http:" &&
                    parsed.protocol !== "https:"
                ) {
                    throw new Error("Invalid URL protocol");
                }
            } catch {
                setError("有効な共有URLを入力してください。");
                return;
            }

            request = {
                mode: "join",
                url: inputUrl,
                nickname: name,
            };
        }


        // ここではまだ登録せず、確認画面へ進む
        setError(null);
        setPendingRequest(request);
    };

    // 確認画面で確定ボタンが押されたときだけ実行
    const handleConfirm = async () => {
        if (!pendingRequest || submitting) return;

        setSubmitting(true);
        setError(null);

        try {
            if (onSubmit) {
                // 本番では外部から渡された登録処理を実行
                await onSubmit(pendingRequest);
                onClose();
            } else {
                // モックでは登録せず、操作完了画面を表示
                setPreviewCompleted(true);
            }
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "処理に失敗しました。もう一度お試しください。"
            );
        } finally {
            setSubmitting(false);
        }
    };


    return (
        <div
            className={styles.backdrop}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                ref={dialogRef}
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="group-add-title"
            >
                <div className={styles.header}>
                    <div>
                        <h2
                            className={styles.title}
                            id="group-add-title"
                        >
                            グループを追加
                        </h2>
                        <p className={styles.subtitle}>
                            新しい話し合いを始めるか、
                            既存のグループに参加します。
                        </p>
                    </div>

                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="閉じる"
                    >
                        ×
                    </button>
                </div>


                {previewCompleted ? (
                    <div
                        className={styles.previewResult}
                        role="status"
                    >
                        <h3 className={styles.confirmTitle}>
                            操作を確認できました
                        </h3>

                        <p className={styles.previewNotice}>
                            これはUI確認用です。
                            実際のグループ作成・参加は
                            行っていません。
                        </p>

                        <button
                            type="button"
                            className={styles.submitButton}
                            onClick={onClose}
                        >
                            閉じる
                        </button>
                    </div>
                ) : pendingRequest ? (
                    <div className={styles.previewResult}>
                        <h3 className={styles.confirmTitle}>
                            {pendingRequest.mode === "create"
                                ? "この内容でグループを作成しますか？"
                                : "この内容でグループに参加しますか？"}
                        </h3>

                        <div className={styles.confirmDetails}>
                            <div className={styles.confirmItem}>
                                <span className={styles.confirmLabel}>
                                    {pendingRequest.mode === "create"
                                        ? "グループの議題"
                                        : "参加するURL"}
                                </span>
                                <strong className={styles.confirmValue}>
                                    {pendingRequest.mode === "create"
                                        ? pendingRequest.topic
                                        : pendingRequest.url}
                                </strong>
                            </div>

                            <div className={styles.confirmItem}>
                                <span className={styles.confirmLabel}>
                                    ニックネーム
                                </span>
                                <strong className={styles.confirmValue}>
                                    {pendingRequest.nickname}
                                </strong>
                            </div>
                        </div>

                        {error && (
                            <p
                                className={styles.error}
                                role="alert"
                            >
                                {error}
                            </p>
                        )}

                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                className={styles.backButton}
                                disabled={submitting}
                                onClick={() => {
                                    setPendingRequest(null);
                                    setError(null);
                                }}
                            >
                                戻って修正
                            </button>

                            <button
                                type="button"
                                className={styles.submitButton}
                                disabled={submitting}
                                onClick={() => {
                                    void handleConfirm();
                                }}
                            >
                                {submitting
                                    ? "処理中..."
                                    : pendingRequest.mode === "create"
                                        ? "作成を確定"
                                        : "参加を確定"}
                            </button>
                        </div>
                    </div>
                ) : (

                    <>
                        <div
                            className={styles.modeTabs}
                            role="group"
                            aria-label="グループ追加方法"
                        >
                            <button
                                type="button"
                                className={`${styles.modeButton} ${mode === "create"
                                    ? styles.active
                                    : ""
                                    }`}
                                aria-pressed={mode === "create"}
                                onClick={() => {
                                    setMode("create");
                                    setError(null);
                                }}
                            >
                                新規作成
                            </button>

                            <button
                                type="button"
                                className={`${styles.modeButton} ${mode === "join"
                                    ? styles.active
                                    : ""
                                    }`}
                                aria-pressed={mode === "join"}
                                onClick={() => {
                                    setMode("join");
                                    setError(null);
                                }}
                            >
                                参加
                            </button>
                        </div>

                        <form
                            className={styles.form}
                            onSubmit={handleSubmit}
                        >
                            {mode === "create" ? (
                                <>
                                    <label
                                        className={styles.label}
                                        htmlFor="group-topic"
                                    >
                                        グループの議題
                                    </label>
                                    <input
                                        ref={firstInputRef}
                                        id="group-topic"
                                        className={styles.input}
                                        type="text"
                                        placeholder="例：学園祭の企画について"
                                        maxLength={100}
                                        value={topic}
                                        onChange={(event) =>
                                            setTopic(event.target.value)
                                        }
                                        required
                                    />
                                </>
                            ) : (
                                <>
                                    <label
                                        className={styles.label}
                                        htmlFor="group-url"
                                    >
                                        共有されたTHYNCのURL
                                    </label>
                                    <input
                                        id="group-url"
                                        className={styles.input}
                                        type="url"
                                        placeholder="https://..."
                                        value={url}
                                        onChange={(event) =>
                                            setUrl(event.target.value)
                                        }
                                        required
                                    />
                                </>
                            )}

                            <label
                                className={styles.label}
                                htmlFor="group-nickname"
                            >
                                ニックネーム
                            </label>
                            <input
                                id="group-nickname"
                                className={styles.input}
                                type="text"
                                placeholder="名前を入力"
                                autoComplete="nickname"
                                maxLength={30}
                                value={nickname}
                                onChange={(event) =>
                                    setNickname(event.target.value)
                                }
                                required
                            />

                            {error && (
                                <p
                                    className={styles.error}
                                    role="alert"
                                >
                                    {error}
                                </p>
                            )}

                            <button
                                className={styles.submitButton}
                                type="submit"
                                disabled={
                                    submitting ||
                                    !nickname.trim() ||
                                    !(mode === "create"
                                        ? topic.trim()
                                        : url.trim())
                                }
                            >
                                {submitting
                                    ? "処理中..."
                                    : mode === "create"
                                        ? "グループを作成"
                                        : "グループに参加"}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
