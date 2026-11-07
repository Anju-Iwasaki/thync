
"use client";

import { useState, type FormEvent } from "react";
import styles from "./JoinForm.module.css";

type JoinFormProps = {
    roomId: string;
    topic?: string;
    onJoin: (
        roomId: string,
        nickname: string
    ) => void | Promise<void>;
};

export default function JoinForm({
    roomId,
    topic,
    onJoin,
}: JoinFormProps) {
    const [nickname, setNickname] = useState("");
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const name = nickname.trim();

        if (!name || joining) return;

        setJoining(true);
        setError(null);

        try {
            await onJoin(roomId, name);
        } catch {
            setError(
                "参加できませんでした。もう一度お試しください。"
            );
        } finally {
            setJoining(false);
        }
    };

    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <div className={styles.brand}>
                    <h1 className={styles.logo}>THYNC</h1>
                    <p className={styles.tagline}>
                        THINK × SYNC
                    </p>
                </div>

                <section
                    className={styles.card}
                    aria-labelledby="join-title"
                >
                    <div className={styles.cardHeader}>
                        <h2
                            id="join-title"
                            className={styles.title}
                        >
                            グループに参加
                        </h2>

                        <p className={styles.description}>
                            ニックネームを入力して、
                            話し合いに参加しましょう。
                        </p>
                    </div>

                    {topic && (
                        <div className={styles.roomInfo}>
                            <span className={styles.roomLabel}>
                                参加するグループ
                            </span>
                            <strong className={styles.roomTitle}>
                                {topic}
                            </strong>
                        </div>
                    )}

                    <form
                        className={styles.form}
                        onSubmit={handleSubmit}
                    >
                        <label
                            htmlFor="join-nickname"
                            className={styles.label}
                        >
                            ニックネーム
                        </label>

                        <input
                            id="join-nickname"
                            className={styles.input}
                            type="text"
                            autoComplete="nickname"
                            maxLength={30}
                            placeholder="名前を入力"
                            value={nickname}
                            onChange={(event) => {
                                setNickname(event.target.value);
                                if (error) setError(null);
                            }}
                            disabled={joining}
                            required
                        />

                        <p className={styles.hint}>
                            グループ内でほかの参加者に表示されます。
                        </p>

                        {error && (
                            <p
                                className={styles.error}
                                role="alert"
                            >
                                {error}
                            </p>
                        )}

                        <button
                            className={styles.submit}
                            type="submit"
                            disabled={!nickname.trim() || joining}
                        >
                            {joining
                                ? "参加しています..."
                                : "参加する"}
                        </button>
                    </form>
                </section>

                <p className={styles.footer}>
                    いつもの会話から、みんなの考えを整理する。
                </p>
            </div>
        </main>
    );
}
