
"use client";

import {
    Fragment,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
    type KeyboardEvent,
} from "react";

import type { Member, Message } from "@/types/rows";
import MessageItem from "./MessageItem";
import styles from "./TalkRoom.module.css";


type TalkRoomProps = {
    roomId: string;
    messages: Message[];
    members: Member[];
    currentMemberId: string;
    onSend: (
        body: string,
        replyTo?: string
    ) => void | Promise<void>;
};


type ContextMenuState = {
    message: Message;
    x: number;
    y: number;
};

// 日本時間の日付
const getDateKey = (date: Date): string => {
    return new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
};

// 今日・昨日・通常の日付
const getDateLabel = (
    dateString: string,
    todayKey: string | null
): string => {
    const date = new Date(dateString);
    const messageKey = getDateKey(date);

    if (todayKey !== null) {
        if (messageKey === todayKey) {
            return "今日";
        }

        const [year, month, day] = todayKey
            .split("-")
            .map(Number);

        const previousDay = new Date(
            Date.UTC(year, month - 1, day - 1)
        );

        const yesterdayKey = previousDay
            .toISOString()
            .slice(0, 10);

        if (messageKey === yesterdayKey) {
            return "昨日";
        }
    }

    return new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(date);
};

// 連投の最大間隔
const GROUP_INTERVAL_MS = 5 * 60 * 1000;

const isConsecutiveMessage = (
    current: Message,
    previous?: Message
): boolean => {
    if (!previous) return false;

    if (current.member_id !== previous.member_id) {
        return false;
    }

    const currentTime = new Date(current.created_at);
    const previousTime = new Date(previous.created_at);

    const difference =
        currentTime.getTime() - previousTime.getTime();

    if (
        difference < 0 ||
        difference > GROUP_INTERVAL_MS
    ) {
        return false;
    }

    return (
        getDateKey(currentTime) ===
        getDateKey(previousTime)
    );
};

export default function TalkRoom({
    roomId,
    messages,
    members,
    currentMemberId,
    onSend,
}: TalkRoomProps) {

    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] =
        useState<Message | null>(null);

    // 保存済みの下書きを読み込んだかどうか
    const [draftLoaded, setDraftLoaded] = useState(false);

    const [contextMenu, setContextMenu] =
        useState<ContextMenuState | null>(null);


    // 今回追加する状態
    const [highlightedId, setHighlightedId] =
        useState<string | null>(null);

    const [showBottomButton, setShowBottomButton] =
        useState(false);

    // 最新を見ていない間に届いたメッセージ数
    const [newMessageCount, setNewMessageCount] =
        useState(0);

    // コピー操作の結果を表示
    const [copyNotice, setCopyNotice] =
        useState<string | null>(null);

    const [todayKey, setTodayKey] =
        useState<string | null>(null);

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // 最新の会話を表示しているか
    const shouldAutoScrollRef = useRef(true);

    // 前回のメッセージ件数を保持
    const previousMessageCountRef = useRef(messages.length);

    // ハイライト解除タイマー
    const highlightTimerRef =
        useRef<ReturnType<typeof setTimeout> | null>(null);

    // コピー通知を消すためのタイマー
    const copyNoticeTimerRef =
        useRef<ReturnType<typeof setTimeout> | null>(null);


    // 下書きの保存先をユーザー・グループごとに分離
    const draftStorageKey =
        `thync:talk-draft:v1:${currentMemberId}:${roomId}`;

    // 保存済みの下書きを復元
    useEffect(() => {
        if (draftLoaded) return;

        try {
            const saved = window.localStorage.getItem(
                draftStorageKey
            );

            if (saved) {
                const draft = JSON.parse(saved) as {
                    body?: unknown;
                    replyToId?: unknown;
                };

                if (typeof draft.body === "string") {
                    setInput(draft.body);
                }

                if (typeof draft.replyToId === "string") {
                    const originalMessage = messages.find(
                        (message) => message.id === draft.replyToId
                    );

                    setReplyTo(originalMessage ?? null);
                }
            }
        } catch (error) {
            console.warn("下書きの復元に失敗:", error);
        } finally {
            setDraftLoaded(true);
        }
    }, [draftStorageKey, draftLoaded, messages]);

    // 入力内容と返信先を自動保存
    useEffect(() => {
        if (!draftLoaded) return;

        try {
            if (!input && !replyTo) {
                window.localStorage.removeItem(
                    draftStorageKey
                );
                return;
            }

            window.localStorage.setItem(
                draftStorageKey,
                JSON.stringify({
                    body: input,
                    replyToId: replyTo?.id ?? null,
                })
            );
        } catch (error) {
            console.warn("下書きの保存に失敗:", error);
        }
    }, [draftStorageKey, draftLoaded, input, replyTo]);

    // 復元した文章に合わせて入力欄の高さを調整
    useEffect(() => {
        const textarea = inputRef.current;
        if (!textarea) return;

        textarea.style.height = "44px";
        textarea.style.height = `${Math.min(
            textarea.scrollHeight,
            150
        )}px`;
    }, [input]);

    // 日付はブラウザ表示後に取得
    useEffect(() => {
        const updateToday = () => {
            setTodayKey(getDateKey(new Date()));
        };


        const initialTimer = window.setTimeout(
            updateToday,
            0
        );

        const interval = window.setInterval(
            updateToday,
            60 * 1000
        );

        return () => {
            window.clearTimeout(initialTimer);
            window.clearInterval(interval);
        };
    }, []);

    // 画面が閉じられたらタイマーを片付ける
    useEffect(() => {
        return () => {
            if (highlightTimerRef.current !== null) {
                clearTimeout(highlightTimerRef.current);
            }

            if (copyNoticeTimerRef.current !== null) {
                clearTimeout(copyNoticeTimerRef.current);
            }
        };
    }, []);

    // 最新メッセージへスクロール
    const scrollToBottom = (
        behavior: ScrollBehavior = "smooth"
    ) => {
        const area = scrollAreaRef.current;
        if (!area) return;

        shouldAutoScrollRef.current = true;
        setShowBottomButton(false);

        setNewMessageCount(0);

        area.scrollTo({
            top: area.scrollHeight,
            behavior,
        });
    };

    // スクロール位置を監視する
    const handleScroll = () => {
        const area = scrollAreaRef.current;
        if (!area) return;

        const distanceFromBottom =
            area.scrollHeight -
            area.scrollTop -
            area.clientHeight;

        const isNearBottom = distanceFromBottom < 120;

        shouldAutoScrollRef.current = isNearBottom;
        setShowBottomButton(!isNearBottom);

        if (isNearBottom) {
            setNewMessageCount(0);
        }
    };


    // 新着メッセージが来たとき
    useEffect(() => {
        const previousCount = previousMessageCountRef.current;
        const currentCount = messages.length;

        // 今回追加されたメッセージ数
        const addedCount = Math.max(
            0,
            currentCount - previousCount
        );

        previousMessageCountRef.current = currentCount;

        if (shouldAutoScrollRef.current) {
            // 最新を見ているときは自動追従
            const area = scrollAreaRef.current;

            if (area) {
                area.scrollTop = area.scrollHeight;
            }
        } else if (addedCount > 0) {
            // 過去を読んでいるときは件数だけ増やす
            setNewMessageCount(
                (previous) => previous + addedCount
            );
        }
    }, [messages.length]);

    // メニュー外クリック・Escで閉じる
    useEffect(() => {
        if (!contextMenu) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (
                event.target instanceof Node &&
                !menuRef.current?.contains(event.target)
            ) {
                setContextMenu(null);
            }
        };

        const handleKeyDown = (
            event: globalThis.KeyboardEvent
        ) => {
            if (event.key === "Escape") {
                setContextMenu(null);
            }
        };

        document.addEventListener(
            "pointerdown",
            handlePointerDown
        );
        document.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            document.removeEventListener(
                "pointerdown",
                handlePointerDown
            );
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [contextMenu]);

    // テキストエリアの自動調整
    const handleInputChange = (
        event: ChangeEvent<HTMLTextAreaElement>
    ) => {
        const textarea = event.target;

        setInput(textarea.value);

        textarea.style.height = "44px";
        textarea.style.height = `${Math.min(
            textarea.scrollHeight,
            150
        )}px`;
    };

    // メッセージ送信
    const handleSend = async (
        event?: FormEvent<HTMLFormElement>
    ) => {
        event?.preventDefault();

        const body = input.trim();

        if (!body || sending) return;

        setSending(true);

        try {
            // 自分の送信時は最新メッセージへ
            shouldAutoScrollRef.current = true;

            await onSend(body, replyTo?.id);

            setInput("");
            setReplyTo(null);

            if (inputRef.current) {
                inputRef.current.style.height = "44px";
                inputRef.current.focus();
            }

            requestAnimationFrame(() => {
                scrollToBottom();
            });
        } catch (error) {
            console.error("メッセージ送信失敗:", error);
        } finally {
            setSending(false);
        }
    };

    // Enterは改行、Ctrl + Enterで送信
    const handleKeyDown = (
        event: KeyboardEvent<HTMLTextAreaElement>
    ) => {
        if (
            event.key === "Enter" &&
            event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey &&
            !event.nativeEvent.isComposing &&
            event.nativeEvent.keyCode !== 229
        ) {
            event.preventDefault();
            void handleSend();
        }
    };

    const sortedMessages = [...messages].sort(
        (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
    );

    // 右クリックメニュー
    const openContextMenu = (
        message: Message,
        x: number,
        y: number
    ) => {
        const menuWidth = 184;
        const menuHeight = 100;
        const margin = 12;

        setContextMenu({
            message,
            x: Math.max(
                margin,
                Math.min(
                    x,
                    window.innerWidth - menuWidth - margin
                )
            ),
            y: Math.max(
                margin,
                Math.min(
                    y,
                    window.innerHeight - menuHeight - margin
                )
            ),
        });
    };

    // 返信
    const startReply = (message: Message) => {
        setReplyTo(message);
        setContextMenu(null);
        inputRef.current?.focus();
    };


    // コピー結果の通知を表示する
    const showCopyNotice = (message: string) => {
        if (copyNoticeTimerRef.current !== null) {
            clearTimeout(copyNoticeTimerRef.current);
        }

        setCopyNotice(message);

        copyNoticeTimerRef.current = setTimeout(() => {
            setCopyNotice(null);
            copyNoticeTimerRef.current = null;
        }, 1800);
    };

    // メッセージをコピー
    const copyMessage = async (message: Message) => {
        try {
            await navigator.clipboard.writeText(message.body);

            showCopyNotice("コピーしました");
        } catch (error) {
            console.error("コピーに失敗:", error);

            showCopyNotice("コピーできませんでした");
        } finally {
            setContextMenu(null);
        }
    };


    // 返信元へジャンプしてハイライト
    const jumpToMessage = (messageId: string) => {
        const area = scrollAreaRef.current;
        const target = document.getElementById(
            `message-${messageId}`
        );

        if (!target || !area || !area.contains(target)) {
            return;
        }

        // 過去の発言へ移動中は自動追従を止める
        shouldAutoScrollRef.current = false;

        target.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });

        // 同じメッセージを何度押しても再点灯
        if (highlightTimerRef.current !== null) {
            clearTimeout(highlightTimerRef.current);
        }

        setHighlightedId(null);

        requestAnimationFrame(() => {
            setHighlightedId(messageId);
        });

        highlightTimerRef.current = setTimeout(() => {
            setHighlightedId(null);
            highlightTimerRef.current = null;
        }, 1800);
    };

    const replySender = replyTo
        ? members.find(
            (member) => member.id === replyTo.member_id
        )
        : null;

    return (
        <div className={styles.talkRoom}>
            {/* 会話履歴 */}
            <div
                className={styles.messageArea}
                ref={scrollAreaRef}
                onScroll={handleScroll}
            >
                <div className={styles.messageList}>
                    {sortedMessages.map((message, index) => {
                        const sender = members.find(
                            (member) => member.id === message.member_id
                        );

                        if (!sender) return null;

                        const previous = sortedMessages[index - 1];

                        const showSender =
                            !isConsecutiveMessage(message, previous);

                        const replyMessage = message.reply_to
                            ? sortedMessages.find(
                                (item) =>
                                    item.id === message.reply_to
                            )
                            : null;

                        const replySender = replyMessage
                            ? members.find(
                                (member) =>
                                    member.id === replyMessage.member_id
                            )
                            : null;

                        const currentDate = getDateKey(
                            new Date(message.created_at)
                        );

                        const previousDate = previous
                            ? getDateKey(
                                new Date(previous.created_at)
                            )
                            : null;

                        return (
                            <Fragment key={message.id}>
                                {currentDate !== previousDate && (
                                    <div className={styles.dateSeparator}>
                                        <span className={styles.dateLabel}>
                                            {getDateLabel(
                                                message.created_at,
                                                todayKey
                                            )}
                                        </span>
                                    </div>
                                )}

                                <MessageItem
                                    message={message}
                                    sender={sender}
                                    isMine={
                                        message.member_id === currentMemberId
                                    }
                                    showSender={showSender}
                                    isHighlighted={
                                        highlightedId === message.id
                                    }
                                    replyMessage={replyMessage}
                                    replySender={replySender}
                                    onReplyClick={jumpToMessage}
                                    onContextMenu={openContextMenu}
                                />
                            </Fragment>
                        );
                    })}
                </div>
            </div>

            {/* 最新メッセージへ戻るボタン */}
            {showBottomButton && (
                <button
                    type="button"
                    className={styles.jumpBottom}
                    onClick={() => scrollToBottom()}
                    aria-label={
                        newMessageCount > 0
                            ? `新着${newMessageCount}件。最新メッセージへ移動`
                            : "最新メッセージへ移動"
                    }
                    title="最新メッセージへ移動"
                >
                    <span aria-hidden="true">↓</span>

                    {newMessageCount > 0 && (
                        <span className={styles.newMessageBadge}>
                            {newMessageCount > 99
                                ? "99+"
                                : newMessageCount}
                        </span>
                    )}
                </button>
            )}

            {/* 返信中の表示 */}
            {replyTo && (
                <div className={styles.replyBar}>
                    <div className={styles.replyBarContent}>
                        <span className={styles.replyBarTitle}>
                            {replySender?.nickname ??
                                "不明なユーザー"}
                            への返信
                        </span>

                        <span className={styles.replyBarBody}>
                            {replyTo.retracted_at
                                ? "送信が取り消されました"
                                : replyTo.body}
                        </span>
                    </div>

                    <button
                        type="button"
                        className={styles.cancelReply}
                        onClick={() => setReplyTo(null)}
                        aria-label="返信をキャンセル"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* 入力エリア */}
            <form
                className={styles.composer}
                onSubmit={handleSend}
            >
                <textarea
                    ref={inputRef}
                    className={styles.input}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="メッセージを入力…"
                    aria-label="メッセージを入力"
                    rows={1}
                />

                <button
                    type="submit"
                    className={styles.sendButton}
                    disabled={!input.trim() || sending}
                    aria-label="送信"
                    title="送信（Ctrl + Enter）"
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M12 19V5" />
                        <path d="m5 12 7-7 7 7" />
                    </svg>
                </button>
            </form>

            {/* コピー結果の通知 */}
            {copyNotice && (
                <div
                    className={styles.copyNotice}
                    role="status"
                    aria-live="polite"
                >
                    {copyNotice}
                </div>
            )}

            {/* メッセージの右クリックメニュー */}
            {contextMenu && (
                <div
                    ref={menuRef}
                    className={styles.contextMenu}
                    style={{
                        left: contextMenu.x,
                        top: contextMenu.y,
                    }}
                    role="group"
                    aria-label="メッセージ操作"
                >
                    <button
                        type="button"
                        className={styles.contextMenuItem}
                        onClick={() =>
                            startReply(contextMenu.message)
                        }
                    >
                        <span aria-hidden="true">↩</span>
                        <span>返信</span>
                    </button>

                    <button
                        type="button"
                        className={styles.contextMenuItem}
                        onClick={() => {
                            void copyMessage(contextMenu.message);
                        }}
                    >
                        <span aria-hidden="true">▢</span>
                        <span>コピー</span>
                    </button>
                </div>
            )}
        </div>
    );
}
