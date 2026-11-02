
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/browser";
import { DEFAULT_ANALYSIS_MODE } from "@/constants";
import {
    getSavedMemberId,
    saveMembership,
} from "@/lib/client/roomMembership";

import type {
    GroupAddRequest,
} from "../layout/GroupAddDialog";

import RoomMembershipGate from "../RoomMembershipGate";
import AppShell from "../layout/AppShell";
import Sidebar, {
    type SidebarGroup,
} from "../layout/Sidebar";
import RoomHeader from "../layout/RoomHeader";
import RoomTabs, {
    type RoomTab,
} from "../layout/RoomTabs";

import TalkRoom from "../talk/TalkRoom";
import SummaryRoom from "../summary/SummaryRoom";

import { sendMessage } from "@/client/actions";
import type { RoomData } from "@/client/useRoom";
import { buildSummary } from "@/lib/summary/buildSummary";

type Props = {
    roomId: string;
};

export default function RoomLivePreview({
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
        useState<"light" | "dark">("light");

    const [activeTab, setActiveTab] =
        useState<RoomTab>("talk");

    const {
        room,
        members,
        messages,
        reactions,
        notes,
        error,
    } = roomData;

    // 現在のRoomをサイドバーに表示
    const groups: SidebarGroup[] = room
        ? [
            {
                id: roomId,
                title: room.topic,
                memberCount: members.length,
                unreadCount: 0,
            },
        ]
        : [];


    // グループの新規作成・参加を実行
    const handleAddGroup = async (
        request: GroupAddRequest
    ) => {
        let targetRoomId: string;

        if (request.mode === "create") {
            // 新しいRoomをSupabaseに登録
            const { data, error } = await supabase
                .from("rooms")
                .insert({
                    topic: request.topic,
                    analysis_mode: DEFAULT_ANALYSIS_MODE,
                })
                .select()
                .single();

            if (error) {
                throw new Error(
                    `グループの作成に失敗しました: ${error.message}`
                );
            }

            targetRoomId = data.id;
        } else {
            // 共有URLからRoomIDを取得
            let parsed: URL;

            try {
                parsed = new URL(request.url);
            } catch {
                throw new Error("共有URLが正しくありません。");
            }

            // 現在のTHYNCと同じサイトのURLに限定
            if (parsed.origin !== window.location.origin) {
                throw new Error(
                    "現在のTHYNCと同じサイトの共有URLを入力してください。"
                );
            }

            const match = parsed.pathname.match(
                /^\/(?:room|room-ui-preview)\/([0-9a-fA-F-]{36})\/?$/
            );

            if (!match) {
                throw new Error(
                    "THYNCのルーム共有URLを入力してください。"
                );
            }

            targetRoomId = match[1];

            // URLに対応するRoomが実在するか確認
            const { data, error } = await supabase
                .from("rooms")
                .select("id")
                .eq("id", targetRoomId)
                .single();

            if (error || !data) {
                throw new Error(
                    "指定されたグループが見つかりませんでした。"
                );
            }

            // すでに参加している場合は既存のMemberIDを使う
            if (getSavedMemberId(targetRoomId)) {
                router.push(
                    `/room-ui-preview/${targetRoomId}`
                );
                return;
            }
        }

        // 作成した人も、参加する人もMember登録する
        const { data: member, error: memberError } =
            await supabase
                .from("members")
                .insert({
                    room_id: targetRoomId,
                    nickname: request.nickname,
                })
                .select()
                .single();

        if (memberError || !member) {
            throw new Error(
                "メンバー登録に失敗しました: " +
                (memberError?.message ?? "不明なエラー")
            );
        }

        // 今後の復元とサイドバー一覧用に保存
        saveMembership(targetRoomId, member.id);

        // ボスの旧デモ画面との互換性も維持
        try {
            sessionStorage.setItem(
                `thync:member:${targetRoomId}`,
                member.id
            );
        } catch {
            // sessionStorageが使えなくても
            // localStorage側の保存結果は維持する
        }

        // 作成・参加したRoomへ移動
        router.push(
            `/room-ui-preview/${targetRoomId}`
        );
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
                    onSelectGroup={() => {
                        // 複数Room切り替えは次の段階で実装
                    }}
                    theme={theme}
                    onThemeChange={setTheme}
                    onAddGroup={handleAddGroup}
                />
            }
            header={
                <RoomHeader
                    title={room?.topic ?? "読み込み中"}
                    memberCount={members.length}
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
