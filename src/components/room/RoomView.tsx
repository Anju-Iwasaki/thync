
"use client";

import { roomPath } from "@/lib/client/roomRoutes";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createOrJoinRoom } from "@/lib/client/roomActions";

import type {
    GroupAddRequest,
} from "../layout/GroupAddDialog";

import RoomMembershipGate from "../RoomMembershipGate";
import AppShell from "../layout/AppShell";
import Sidebar from "../layout/Sidebar";
import RoomHeader from "../layout/RoomHeader";
import RoomTabs, {
    type RoomTab,
} from "../layout/RoomTabs";

import TalkRoom from "../talk/TalkRoom";
import ThyncBoard, {
    type BoardMode,
    type BoardLineStyle,
} from "../thync/ThyncBoard";
import SummaryRoom from "../summary/SummaryRoom";

import {
    sendMessage,
    react,
    unreact,
    retractMessage,
} from "@/client/actions";
import type { ReactionValue } from "@/types/domain";
import type { RoomData } from "@/client/useRoom";
import { buildSummary } from "@/lib/summary/buildSummary";
import { useJoinedRoomGroups } from "@/lib/client/useJoinedRoomGroups";

type Props = {
    roomId: string;
};

// 同じブラウザタブ内で外観設定を共有する
// グループ切替時にライトモードへ戻ることを防ぐ
let cachedTheme: "light" | "dark" | null = null;

export default function RoomView({
    roomId,
}: Props) {
    return (
        <RoomMembershipGate roomId={roomId}>
            {(memberId, roomData) => (
                <RoomLiveContent
                    key={roomId}
                    roomId={roomId}
                    memberId={memberId}
                    roomData={roomData}
                />
            )}
        </RoomMembershipGate>
    );
}

function RoomLiveContent({
    roomId,
    memberId,
    roomData,
}: {
    roomId: string;
    memberId: string;
    roomData: RoomData;
}) {
    const router = useRouter();

    const [theme, setTheme] =
        useState<"light" | "dark">(
            () => cachedTheme ?? "light"
        );

    // グループが変わるたびに共通の外観設定を反映する
    useEffect(() => {
        const timer = window.setTimeout(() => {
            try {
                const savedTheme = localStorage.getItem("thync:theme");

                if (savedTheme === "light" || savedTheme === "dark") {
                    cachedTheme = savedTheme;
                    setTheme(savedTheme);
                } else if (cachedTheme !== null) {
                    setTheme(cachedTheme);
                }
            } catch {
                if (cachedTheme !== null) {
                    setTheme(cachedTheme);
                }
            }
        }, 0);

        return () => window.clearTimeout(timer);
    }, [roomId]);

    const handleThemeChange = (nextTheme: "light" | "dark") => {
        // 次のグループでも最初から同じ外観を使用
        cachedTheme = nextTheme;
        setTheme(nextTheme);

        try {
            localStorage.setItem("thync:theme", nextTheme);
        } catch {
            // 保存できなくても画面上の切替は有効
        }
    };


    // ========================================
    // ユーザーごとの外観設定
    // ========================================

    type AccentPalette =
        "neutral" | "sky" | "mint" | "rose";

    type FontSizeMode =
        "small" | "normal" | "large";

    const [accentPalette, setAccentPalette] =
        useState<AccentPalette>("neutral");

    const [fontSizeMode, setFontSizeMode] =
        useState<FontSizeMode>("normal");

    useEffect(() => {
        const timer = window.setTimeout(() => {
            try {
                const savedPalette =
                    localStorage.getItem("thync:accent-palette");
                const savedSize =
                    localStorage.getItem("thync:font-size");

                if (
                    savedPalette === "neutral" ||
                    savedPalette === "sky" ||
                    savedPalette === "mint" ||
                    savedPalette === "rose"
                ) {
                    setAccentPalette(savedPalette);
                }

                if (
                    savedSize === "small" ||
                    savedSize === "normal" ||
                    savedSize === "large"
                ) {
                    setFontSizeMode(savedSize);
                }
            } catch {
                // 保存値を読めない場合は初期設定を使用
            }
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);

    const handleAccentPaletteChange = (
        palette: AccentPalette
    ) => {
        setAccentPalette(palette);
        try {
            localStorage.setItem(
                "thync:accent-palette",
                palette
            );
        } catch { }
    };

    const handleFontSizeChange = (
        size: FontSizeMode
    ) => {
        setFontSizeMode(size);
        try {
            localStorage.setItem(
                "thync:font-size",
                size
            );
        } catch { }
    };


    const [activeTab, setActiveTab] =
        useState<RoomTab>("talk");

    const [jumpTargetMessageId, setJumpTargetMessageId] =
        useState<string | null>(null);

    const handleJumpToMessage = (messageId: string) => {
        setJumpTargetMessageId(messageId);
        setActiveTab("talk");
    };

    // THYNCボードのデータ切り替え（UI検証用）
    const [boardMode, setBoardMode] =
        useState<BoardMode>("auto");

    // 接続線の描画スタイル
    const [boardLineStyle, setBoardLineStyle] =
        useState<BoardLineStyle>("rounded");

    const [shareUrl, setShareUrl] = useState<string | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            // ブラウザ上で共有URLを生成する
            const url = new URL(
                roomPath(roomId),
                window.location.origin
            );

            setShareUrl(url.toString());
        }, 0);

        return () => window.clearTimeout(timer);
    }, [roomId]);

    const {
        room,
        members,
        messages,
        reactions,
        notes,
        error,
    } = roomData;

    // 参加済みの全Roomをサイドバーに表示
    const groups = useJoinedRoomGroups(
        roomId,
        room?.topic ?? null,
        members.length
    );


    // グループの作成・参加は共通処理に委譲する
    const handleAddGroup = async (
        request: GroupAddRequest
    ) => {
        const targetRoomId = await createOrJoinRoom(request);

        router.push(roomPath(targetRoomId));
    };


    // 本番のメッセージ送信
    const handleSend = async (
        body: string,
        replyTo?: string
    ) => {
        await sendMessage(
            roomId,
            memberId,
            body,
            replyTo
        );

        // メッセージはRealtimeから受信する。
        // ここで独自に追加しない。
    };

    // 賛成・反対を切り替える
    const handleReaction = async (
        messageId: string,
        value: ReactionValue
    ) => {
        const mine = reactions.find(
            (reaction) =>
                reaction.message_id === messageId &&
                reaction.member_id === memberId
        );

        if (mine?.value === value) {
            // 同じボタンを押したら投票取消
            await unreact(messageId, memberId);
        } else {
            // 新規投票・投票変更
            await react(messageId, memberId, value);
        }

        // 表示の更新はuseRoomのRealtimeに任せる
    };

    // 送信取消は既存APIを利用する
    const handleRetract = async (messageId: string) => {
        await retractMessage(messageId, memberId);
    };

    // notes と reactions からSummaryを構成
    const summaryRows = buildSummary(
        notes,
        reactions
    );

    return (

        <AppShell
            theme={theme}
            accentPalette={accentPalette}
            fontSizeMode={fontSizeMode}
            sidebar={

                <Sidebar
                    groups={groups}
                    selectedGroupId={roomId}
                    onSelectGroup={(targetRoomId) => {
                        if (targetRoomId !== roomId) {
                            router.push(roomPath(targetRoomId));
                        }
                    }}
                    theme={theme}

                    onThemeChange={handleThemeChange}
                    accentPalette={accentPalette}
                    onAccentPaletteChange={handleAccentPaletteChange}
                    fontSizeMode={fontSizeMode}
                    onFontSizeChange={handleFontSizeChange}
                    boardLineStyle={boardLineStyle}

                    onBoardLineStyleChange={setBoardLineStyle}
                    debugActions={[
                        {
                            label: `THYNCデータ表示: ${boardMode === "auto"
                                ? "自動"
                                : boardMode === "mock"
                                    ? "モック"
                                    : "実データ"
                                }（切替）`,
                            onClick: () => {
                                setBoardMode((current) =>
                                    current === "auto"
                                        ? "mock"
                                        : current === "mock"
                                            ? "live"
                                            : "auto"
                                );
                            },
                        },
                    ]}

                    onAddGroup={handleAddGroup}
                />
            }
            header={
                <RoomHeader
                    title={room?.topic ?? "読み込み中"}
                    memberCount={members.length}
                    shareUrl={shareUrl}
                />
            }
            tabs={
                <RoomTabs
                    activeTab={activeTab}
                    onChangeTab={setActiveTab}
                />
            }
        >
            {error && (
                <p
                    role="alert"
                    style={{
                        padding: "12px 16px",
                        color: "#dc2626",
                    }}
                >
                    {error}
                </p>
            )}

            {activeTab === "talk" ? (
                <TalkRoom
                    key={`${roomId}:${memberId}`}
                    roomId={roomId}
                    jumpToMessageId={jumpTargetMessageId}
                    messages={messages}
                    members={members}
                    currentMemberId={memberId}
                    reactions={reactions}
                    onReaction={handleReaction}
                    onRetract={handleRetract}
                    onSend={handleSend}
                />
            ) : activeTab === "summary" ? (
                <SummaryRoom
                    rows={summaryRows}
                    members={members}
                    insights={[]}
                />
            ) : (

                <ThyncBoard
                    notes={notes}
                    members={members}
                    messages={messages}
                    reactions={reactions}
                    onJumpToMessage={handleJumpToMessage}
                    mode={boardMode}
                    lineStyle={boardLineStyle}
                />

            )}
        </AppShell>
    );
}
