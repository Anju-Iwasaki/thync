
import type { MouseEvent } from "react";
import type { Member, Message } from "@/types/rows";
import type { ReactionValue } from "@/types/domain";
import styles from "./MessageItem.module.css";

type MessageItemProps = {
    message: Message;
    sender: Member;
    isMine: boolean;
    showSender?: boolean;
    isHighlighted?: boolean;
    replyMessage?: Message | null;
    replySender?: Member | null;
    onReplyClick?: (messageId: string) => void;

    proCount?: number;
    conCount?: number;
    myReaction?: ReactionValue | null;
    reactionDisabled?: boolean;
    onReaction?: (
        messageId: string,
        value: ReactionValue
    ) => void;

    // 右クリックメニューを開くための処理
    onContextMenu?: (
        message: Message,
        x: number,
        y: number
    ) => void;
};

export default function MessageItem({
    message,
    sender,
    isMine,
    showSender = true,
    isHighlighted = false,
    replyMessage,
    replySender,
    onReplyClick,
    proCount = 0,
    conCount = 0,
    myReaction = null,
    reactionDisabled = false,
    onReaction,
    onContextMenu,
}: MessageItemProps) {
    const time = new Intl.DateTimeFormat("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tokyo",
    }).format(new Date(message.created_at));

    const isRetracted = message.retracted_at !== null;

    const handleContextMenu = (
        event: MouseEvent<HTMLElement>
    ) => {
        if (isRetracted || !onContextMenu) return;

        event.preventDefault();

        onContextMenu(
            message,
            event.clientX,
            event.clientY
        );
    };


    return (
        <article
            id={`message-${message.id}`}
            className={[
                styles.message,
                isMine ? styles.mine : styles.other,
                !showSender ? styles.grouped : "",
                isHighlighted ? styles.highlighted : "",
            ].join(" ")}
        >
            {!isMine && (
                <div
                    className={`${styles.avatar} ${!showSender ? styles.avatarHidden : ""
                        }`}
                    aria-hidden="true"
                >
                    {sender.nickname.charAt(0)}
                </div>
            )}

            <div className={styles.messageContent}>
                {!isMine && showSender && (
                    <span className={styles.senderName}>
                        {sender.nickname}
                    </span>
                )}

                <div className={styles.messageRow}>
                    <div
                        className={[
                            styles.bubbleStack,
                            !isRetracted && (proCount > 0 || conCount > 0)
                                ? styles.hasReactions
                                : "",
                        ].join(" ")}
                    >
                        <div
                            className={styles.bubble}
                            onContextMenu={handleContextMenu}
                        >
                            {isRetracted ? (
                                <span className={styles.retracted}>
                                    送信が取り消されました
                                </span>
                            ) : (
                                <>
                                    {message.reply_to && (
                                        <button
                                            type="button"
                                            className={styles.replyPreview}
                                            disabled={!replyMessage || !onReplyClick}
                                            onClick={() => {
                                                if (message.reply_to) {
                                                    onReplyClick?.(message.reply_to);
                                                }
                                            }}
                                            title="返信元のメッセージへ"
                                        >
                                            <span className={styles.replySender}>
                                                {replySender?.nickname ?? "返信元"}
                                            </span>
                                            <span className={styles.replyText}>
                                                {replyMessage
                                                    ? replyMessage.retracted_at
                                                        ? "送信が取り消されました"
                                                        : replyMessage.body
                                                    : "元のメッセージが見つかりません"}
                                            </span>
                                        </button>
                                    )}

                                    <p className={styles.body}>
                                        {message.body}
                                    </p>
                                </>
                            )}
                        </div>


                        {!isRetracted &&
                            (proCount > 0 || conCount > 0) && (
                                <div
                                    className={styles.reactionBar}
                                    aria-label="リアクション集計"
                                >
                                    {proCount > 0 && (
                                        <button
                                            type="button"
                                            className={[
                                                styles.reactionButton,
                                                styles.reactionPro,
                                                myReaction === "pro"
                                                    ? styles.reactionSelected
                                                    : "",
                                            ].join(" ")}
                                            aria-label={`賛成 ${proCount}件`}
                                            aria-pressed={myReaction === "pro"}
                                            disabled={
                                                reactionDisabled || !onReaction
                                            }
                                            onClick={() =>
                                                onReaction?.(message.id, "pro")
                                            }
                                        >
                                            <span
                                                className={styles.reactionSymbol}
                                                aria-hidden="true"
                                            >
                                                ○
                                            </span>
                                            <span
                                                className={styles.reactionDivider}
                                                aria-hidden="true"
                                            />
                                            <span>{proCount}</span>
                                        </button>
                                    )}

                                    {conCount > 0 && (
                                        <button
                                            type="button"
                                            className={[
                                                styles.reactionButton,
                                                styles.reactionCon,
                                                myReaction === "con"
                                                    ? styles.reactionSelected
                                                    : "",
                                            ].join(" ")}
                                            aria-label={`反対 ${conCount}件`}
                                            aria-pressed={myReaction === "con"}
                                            disabled={
                                                reactionDisabled || !onReaction
                                            }
                                            onClick={() =>
                                                onReaction?.(message.id, "con")
                                            }
                                        >
                                            <span
                                                className={styles.reactionSymbol}
                                                aria-hidden="true"
                                            >
                                                ×
                                            </span>
                                            <span
                                                className={styles.reactionDivider}
                                                aria-hidden="true"
                                            />
                                            <span>{conCount}</span>
                                        </button>
                                    )}
                                </div>
                            )}

                    </div>

                    <time
                        className={styles.time}
                        dateTime={message.created_at}
                    >
                        {time}
                    </time>
                </div>
            </div>
        </article>
    );
}
