
"use client";

import { useEffect, useState } from "react";

import AppShell from "../../components/layout/AppShell";
import Sidebar, {
    type SidebarGroup,
} from "../../components/layout/Sidebar";
import RoomHeader from "../../components/layout/RoomHeader";
import RoomTabs, {
    type RoomTab,
} from "../../components/layout/RoomTabs";

import TalkRoom from "../../components/talk/TalkRoom";
import SummaryRoom from "../../components/summary/SummaryRoom";
import type { GroupAddRequest } from "../../components/layout/GroupAddDialog";

import type { Message } from "@/types/rows";
import { sample } from "../../lib/sample";
import { getPreviewSummary } from "../../lib/summary/previewSummary";

// UI確認専用のモックグループ
const mockGroups: SidebarGroup[] = [
    {
        id: "group-1",
        title: "技育CAMPの企画について",
        memberCount: 5,
        lastActivity: "たった今",
    },
    {
        id: "group-2",
        title: "研究室旅行について",
        memberCount: 7,
        lastActivity: "2日前",
    },
    {
        id: "group-3",
        title: "学園祭の出し物について",
        memberCount: 4,
        lastActivity: "5日前",
    },
];

const tabLabels: Record<RoomTab, string> = {
    talk: "Talk",
    thync: "THYNC",
    summary: "Summary",
};

// サンプルの最初のメンバーを自分として扱う
const previewMe = sample.members[0];

// サンプルメッセージを時系列に並べる
const previewMessages = [...sample.messages].sort(
    (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
);


/**
 * メッセージの送信日時を相対時間に変換する。
 *
 * createdAt: ISO形式の送信日時
 * now: 現在時刻（ミリ秒）
 */
function formatLastActivity(
    createdAt: string,
    now: number
): string {
    const messageTime = new Date(createdAt).getTime();

    if (!Number.isFinite(messageTime)) {
        return "日時不明";
    }

    const difference = Math.max(0, now - messageTime);

    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(difference / 3600000);
    const days = Math.floor(difference / 86400000);

    if (minutes < 1) {
        return "たった今";
    }

    if (minutes < 60) {
        return `${minutes}分前`;
    }

    if (hours < 24) {
        return `${hours}時間前`;
    }

    if (days < 7) {
        return `${days}日前`;
    }

    return new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "numeric",
        day: "numeric",
    }).format(new Date(createdAt));
}



export default function UIPreviewPage() {
    // 初期モックに加え、新規作成したグループも管理
    const [groups, setGroups] =
        useState<SidebarGroup[]>(mockGroups);

    // 作成時に指定したニックネームをグループ別に保持
    const [nicknamesByGroup, setNicknamesByGroup] =
        useState<Record<string, string>>({});

    const [selectedGroupId, setSelectedGroupId] =
        useState<string>("group-1");

    // グループごとの未読件数
    const [unreadByGroup, setUnreadByGroup] = useState<
        Record<string, number>
    >({
        "group-1": 0,
        "group-2": 0,
        "group-3": 0,
    });

    // グループを開くと、そのグループの未読をクリア
    const handleSelectGroup = (groupId: string) => {
        setSelectedGroupId(groupId);

        setUnreadByGroup((previous) => ({
            ...previous,
            [groupId]: 0,
        }));
    };

    const [activeTab, setActiveTab] =
        useState<RoomTab>("talk");


    const [theme, setTheme] =
        useState<"light" | "dark">("light");


    // 相対時間表示の基準となる現在時刻
    const [currentTime, setCurrentTime] =
        useState<number | null>(null);

    // ブラウザ側で1分ごとに時刻を更新
    useEffect(() => {
        const updateTime = () => {
            setCurrentTime(Date.now());
        };

        const initialTimer = window.setTimeout(updateTime, 0);
        const interval = window.setInterval(updateTime, 60000);

        return () => {
            window.clearTimeout(initialTimer);
            window.clearInterval(interval);
        };
    }, []);


    // グループごとの独立したメッセージ履歴
    const [messagesByGroup, setMessagesByGroup] = useState<
        Record<string, Message[]>
    >({
        // 技育CAMP：既存のサンプル会話
        "group-1": previewMessages,

        // 研究室旅行：モック会話
        "group-2": [
            {
                ...sample.messages[0],
                id: "mock-trip-1",
                body: "研究室旅行の行き先、みんなどこがいい？",
                reply_to: null,
            },
            {
                ...sample.messages[1],
                id: "mock-trip-2",
                body: "温泉とか行けたら楽しそう！",
                reply_to: null,
            },
        ],

        // 学園祭：モック会話
        "group-3": [
            {
                ...sample.messages[0],
                id: "mock-festival-1",
                body: "今年の学園祭、何を出そうか？",
                reply_to: null,
            },
            {
                ...sample.messages[1],
                id: "mock-festival-2",
                body: "展示か体験型の企画がいいかも！",
                reply_to: null,
            },
        ],
    });


    // 各グループの最新メッセージ日時を反映する
    const groupsWithActivity: SidebarGroup[] = groups.map(
        (group) => {
            const groupMessages =
                messagesByGroup[group.id] ?? [];

            // 最新の送信日時を取得
            const latestMessage = groupMessages.reduce<
                Message | null
            >((latest, message) => {
                if (!latest) return message;

                return new Date(message.created_at).getTime() >
                    new Date(latest.created_at).getTime()
                    ? message
                    : latest;
            }, null);


            return {
                ...group,
                unreadCount: unreadByGroup[group.id] ?? 0,
                lastActivity: latestMessage
                    ? currentTime === null
                        ? "—"
                        : formatLastActivity(
                            latestMessage.created_at,
                            currentTime
                        )
                    : "メッセージなし",
            };

        }
    );



    // モック送信：現在選択中のグループへ追加
    const handleMockSend = (
        body: string,
        replyTo?: string
    ) => {
        const newMessage: Message = {
            ...sample.messages[0],
            id: crypto.randomUUID(),
            room_id: selectedGroupId,
            member_id: previewMe.id,
            body,
            reply_to: replyTo ?? null,
            created_at: new Date().toISOString(),
            retracted_at: null,
        };


        setMessagesByGroup((previous) => ({
            ...previous,
            [selectedGroupId]: [
                ...(previous[selectedGroupId] ?? []),
                newMessage,
            ],
        }));
    };


    // UIプレビュー専用：新しいグループを作成
    const handleMockAddGroup = (
        request: GroupAddRequest
    ) => {
        if (request.mode === "join") {
            throw new Error(
                "共有URLからの参加は、現在モックでは未対応です。"
            );
        }

        const groupId = crypto.randomUUID();

        const newGroup: SidebarGroup = {
            id: groupId,
            title: request.topic,
            memberCount: 1,
            lastActivity: "メッセージなし",
            unreadCount: 0,
        };

        setGroups((previous) => [
            ...previous,
            newGroup,
        ]);

        setMessagesByGroup((previous) => ({
            ...previous,
            [groupId]: [],
        }));

        setUnreadByGroup((previous) => ({
            ...previous,
            [groupId]: 0,
        }));

        setNicknamesByGroup((previous) => ({
            ...previous,
            [groupId]: request.nickname,
        }));

        // 作成したグループをすぐ開く
        setSelectedGroupId(groupId);
        setActiveTab("talk");
    };



    // UIプレビュー専用：別ユーザーからの疑似受信
    const handleMockReceive = (
        targetGroupId: string,
        count: number = 1
    ) => {
        // 自分以外のメンバーを送信者にする
        const otherMember = sample.members.find(
            (member) => member.id !== previewMe.id
        );

        if (!otherMember) {
            console.error("疑似受信に使えるメンバーがいません");
            return;
        }

        const receivedAt = Date.now();

        const incomingMessages: Message[] = Array.from(
            { length: count },
            (_, index) => ({
                ...sample.messages[0],
                id: crypto.randomUUID(),
                room_id: targetGroupId,
                member_id: otherMember.id,
                body:
                    count === 1
                        ? "【テスト受信】新しいメッセージです！"
                        : `【テスト受信】${index + 1}件目のメッセージ`,
                reply_to: null,
                created_at: new Date(
                    receivedAt + index
                ).toISOString(),
                retracted_at: null,
            })
        );

        // 対象グループの会話に追加
        setMessagesByGroup((previous) => ({
            ...previous,
            [targetGroupId]: [
                ...(previous[targetGroupId] ?? []),
                ...incomingMessages,
            ],
        }));

        // 開いていないグループだけ未読を増やす
        if (targetGroupId !== selectedGroupId) {
            setUnreadByGroup((previous) => ({
                ...previous,
                [targetGroupId]:
                    (previous[targetGroupId] ?? 0) + count,
            }));
        }
    };

    const selectedGroup =
        groups.find(
            (group) => group.id === selectedGroupId
        ) ?? groups[0];

    // 新規作成グループでは指定したニックネームを使用
    const previewMembers = sample.members.map(
        (member, index) =>
            index === 0
                ? {
                    ...member,
                    nickname:
                        nicknamesByGroup[selectedGroupId] ??
                        member.nickname,
                }
                : member
    );

    // 新規グループのSummaryは空から開始
    const isInitialGroup = mockGroups.some(
        (group) => group.id === selectedGroupId
    );

    const previewSummary = isInitialGroup
        ? getPreviewSummary(
            selectedGroupId,
            previewMembers
        )
        : {
            rows: [],
            insights: [],
        };

    // 疑似受信する別グループ
    const otherGroup =
        groups.find(
            (group) => group.id !== selectedGroupId
        ) ?? groups[0];


    return (
        <AppShell
            theme={theme}
            sidebar={

                <Sidebar
                    groups={groupsWithActivity}
                    selectedGroupId={selectedGroupId}
                    onSelectGroup={handleSelectGroup}
                    theme={theme}
                    onThemeChange={setTheme}
                    onAddGroup={handleMockAddGroup}
                    debugActions={[
                        {
                            label: "現在のグループに1件受信",
                            onClick: () =>
                                handleMockReceive(selectedGroupId, 1),
                        },
                        {
                            label: "別グループに1件受信",
                            onClick: () =>
                                handleMockReceive(otherGroup.id, 1),
                        },
                        {
                            label: "別グループに100件受信",
                            onClick: () =>
                                handleMockReceive(otherGroup.id, 100),
                        },
                    ]}
                />

            }
            header={
                <RoomHeader
                    title={selectedGroup.title}
                    memberCount={selectedGroup.memberCount}
                />
            }
            tabs={
                <RoomTabs
                    activeTab={activeTab}
                    onChangeTab={setActiveTab}
                />
            }
        >
            {activeTab === "talk" ? (


                <TalkRoom
                    key={selectedGroupId}
                    roomId={selectedGroupId}
                    messages={messagesByGroup[selectedGroupId] ?? []}
                    members={previewMembers}
                    currentMemberId={previewMe.id}
                    onSend={handleMockSend}
                />



            ) : activeTab === "summary" ? (
                <SummaryRoom
                    rows={previewSummary.rows}
                    members={previewMembers}
                    insights={previewSummary.insights}
                />
            ) : (
                <div
                    style={{
                        minHeight: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "12px",
                        padding: "24px",
                        textAlign: "center",
                    }}
                >
                    <h2
                        style={{
                            margin: 0,
                            fontSize: "24px",
                            fontWeight: 600,
                        }}
                    >
                        {tabLabels[activeTab]}
                    </h2>

                    <p
                        style={{
                            margin: 0,
                            fontSize: "13px",
                            color: "var(--thync-text-muted)",
                        }}
                    >
                        このルームは準備中です
                    </p>
                </div>
            )}

        </AppShell>
    );
}
