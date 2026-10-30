
"use client";

import { useState } from "react";

import AppShell from "../../components/layout/AppShell";
import Sidebar, {
    type SidebarGroup,
} from "../../components/layout/Sidebar";
import RoomHeader from "../../components/layout/RoomHeader";
import RoomTabs, {
    type RoomTab,
} from "../../components/layout/RoomTabs";

// UIプレビュー専用のモックデータ
// 実際のSupabaseデータとは無関係
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

export default function UIPreviewPage() {
    const [selectedGroupId, setSelectedGroupId] =
        useState<string>("group-1");

    const [activeTab, setActiveTab] =
        useState<RoomTab>("talk");

    // 追加：現在のカラーテーマ
    const [theme, setTheme] =
        useState<"light" | "dark">("light");

    const selectedGroup =
        mockGroups.find(
            (group) => group.id === selectedGroupId
        ) ?? mockGroups[0];

    return (
        <AppShell
            theme={theme}
            sidebar={
                <Sidebar
                    groups={mockGroups}
                    selectedGroupId={selectedGroupId}
                    onSelectGroup={setSelectedGroupId}
                    theme={theme}
                    onThemeChange={setTheme}
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
        </AppShell>
    );
}
