
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

    const [activeTab, setActiveTab] =
        useState<RoomTab>("talk");

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
                <div
                    style={{
                        minHeight: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 32,
                        gap: 12,
                        textAlign: "center",
                    }}
                >
                    <h2 style={{ margin: 0 }}>
                        THYNC
                    </h2>

                    <p
                        style={{
                            color: "var(--thync-text-muted)",
                            fontSize: 13,
                        }}
                    >
                        ボード画面は今後接続します。
                    </p>
                </div>
            )}
        </AppShell>
    );
}
