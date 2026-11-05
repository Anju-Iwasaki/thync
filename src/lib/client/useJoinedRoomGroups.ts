
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import type { SidebarGroup } from "@/components/layout/Sidebar";

const MEMBER_KEY_PREFIX = "thync:member:";
const LAST_READ_KEY_PREFIX = "thync:last-read:";

type StoredGroup = SidebarGroup & {
    latestMessageAt: string | null;
};

function formatLastActivity(
    createdAt: string | null,
    now: number
): string {
    if (!createdAt) return "メッセージなし";

    const timestamp = new Date(createdAt).getTime();

    if (!Number.isFinite(timestamp)) {
        return "日時不明";
    }

    const difference = Math.max(0, now - timestamp);
    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(difference / 3600000);
    const days = Math.floor(difference / 86400000);

    if (minutes < 1) return "たった今";
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;

    return new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(createdAt));
}

function getRoomMemberships(): Map<string, string> {
    const result = new Map<string, string>();

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            if (!key?.startsWith(MEMBER_KEY_PREFIX)) {
                continue;
            }

            const roomId = key.slice(
                MEMBER_KEY_PREFIX.length
            );

            const memberId = localStorage.getItem(key);

            if (roomId && memberId) {
                result.set(roomId, memberId);
            }
        }
    } catch (error) {
        console.warn("参加情報の取得に失敗:", error);
    }

    return result;
}

function getLastRead(roomId: string): string | null {
    try {
        return localStorage.getItem(
            LAST_READ_KEY_PREFIX + roomId
        );
    } catch {
        return null;
    }
}

function saveLastRead(
    roomId: string,
    timestamp: string
): void {
    try {
        const key = LAST_READ_KEY_PREFIX + roomId;
        const previous = localStorage.getItem(key);

        // 既読位置を過去に戻さない
        if (
            !previous ||
            new Date(timestamp).getTime() >
            new Date(previous).getTime()
        ) {
            localStorage.setItem(key, timestamp);
        }
    } catch (error) {
        console.warn("既読情報の保存に失敗:", error);
    }
}

/**
 * 参加済みグループの一覧。
 *
 * - グループ名・参加人数を取得
 * - 最新メッセージ日時を取得
 * - 未読件数を取得
 * - メッセージのINSERTをRealtime購読
 *
 * 既読位置はブラウザのlocalStorageに保存する。
 */
export function useJoinedRoomGroups(
    currentRoomId: string,
    currentRoomTitle: string | null,
    currentMemberCount: number
): SidebarGroup[] {
    const [savedGroups, setSavedGroups] =
        useState<StoredGroup[]>([]);

    const [now, setNow] = useState<number | null>(null);

    // 相対時刻を1分ごとに更新
    useEffect(() => {
        const updateTime = () => setNow(Date.now());

        updateTime();

        const interval = window.setInterval(
            updateTime,
            60000
        );

        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        let cancelled = false;
        let requestNumber = 0;

        const memberships = getRoomMemberships();

        if (!memberships.has(currentRoomId)) {
            // 現在のRoomは必ず表示対象にする
            memberships.set(currentRoomId, "");
        }

        const roomIds = [...memberships.keys()];

        async function loadGroups() {
            const requestId = ++requestNumber;

            const [roomsResult, membersResult] =
                await Promise.all([
                    supabase
                        .from("rooms")
                        .select("id, topic")
                        .in("id", roomIds),

                    supabase
                        .from("members")
                        .select("room_id")
                        .in("room_id", roomIds),
                ]);

            if (cancelled || requestId !== requestNumber) {
                return;
            }

            if (roomsResult.error || membersResult.error) {
                console.error(
                    "グループ一覧取得失敗:",
                    roomsResult.error,
                    membersResult.error
                );
                return;
            }

            const rooms = roomsResult.data ?? [];
            const members = membersResult.data ?? [];

            const nextGroups = await Promise.all(
                roomIds.map(async (id): Promise<StoredGroup | null> => {
                    const room = rooms.find(
                        (item) => item.id === id
                    );

                    if (!room) return null;

                    const { data, error } = await supabase
                        .from("messages")
                        .select("created_at")
                        .eq("room_id", id)
                        .order("created_at", {
                            ascending: false,
                        })
                        .limit(1);

                    if (error) {
                        console.error(
                            "最新メッセージ取得失敗:",
                            id,
                            error
                        );
                    }

                    const latestMessageAt =
                        data?.[0]?.created_at ?? null;

                    let unreadCount = 0;

                    if (latestMessageAt && !error) {
                        const lastRead = getLastRead(id);

                        if (id === currentRoomId) {
                            // 開いているグループは既読にする
                            saveLastRead(id, latestMessageAt);
                        } else if (!lastRead) {
                            // 初回導入時は過去ログを未読扱いしない
                            saveLastRead(id, latestMessageAt);
                        } else {
                            const memberId =
                                memberships.get(id) ?? "";

                            let unreadQuery = supabase
                                .from("messages")
                                .select("*", {
                                    count: "exact",
                                    head: true,
                                })
                                .eq("room_id", id)
                                .gt("created_at", lastRead);

                            // 自分の投稿は未読に含めない
                            if (memberId) {
                                unreadQuery = unreadQuery.neq(
                                    "member_id",
                                    memberId
                                );
                            }

                            const unreadResult =
                                await unreadQuery;

                            if (unreadResult.error) {
                                console.error(
                                    "未読取得失敗:",
                                    id,
                                    unreadResult.error
                                );
                            } else {
                                unreadCount =
                                    unreadResult.count ?? 0;
                            }
                        }
                    }

                    return {
                        id,
                        title: room.topic,
                        memberCount: members.filter(
                            (member) => member.room_id === id
                        ).length,
                        unreadCount,
                        latestMessageAt,
                    };
                })
            );

            if (cancelled || requestId !== requestNumber) {
                return;
            }

            setSavedGroups(
                nextGroups.filter(
                    (group): group is StoredGroup =>
                        group !== null
                )
            );

            // 新着時刻もすぐ表示更新
            setNow(Date.now());
        }

        // 参加済みRoomだけをRealtime購読する
        const channel = supabase.channel(
            `sidebar-activity:${currentRoomId}`
        );

        for (const id of roomIds) {
            channel.on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `room_id=eq.${id}`,
                },
                () => {
                    void loadGroups();
                }
            );
        }

        channel.subscribe((status, error) => {
            if (cancelled) return;

            if (status === "SUBSCRIBED") {
                // 購読確立後に取得し、開始時の取りこぼしを防ぐ
                void loadGroups();
            } else if (
                status === "CHANNEL_ERROR" ||
                status === "TIMED_OUT"
            ) {
                console.error(
                    "サイドバーRealtime接続失敗:",
                    status,
                    error
                );
            }
        });

        return () => {
            cancelled = true;
            void supabase.removeChannel(channel);
        };
    }, [currentRoomId]);

    const groups: SidebarGroup[] = savedGroups.map(
        (group) => ({
            id: group.id,
            title:
                group.id === currentRoomId
                    ? currentRoomTitle ?? group.title
                    : group.title,
            memberCount:
                group.id === currentRoomId
                    ? currentMemberCount
                    : group.memberCount,
            unreadCount: group.unreadCount,
            lastActivity:
                now === null
                    ? "—"
                    : formatLastActivity(
                        group.latestMessageAt,
                        now
                    ),
        })
    );

    if (
        currentRoomTitle &&
        !groups.some(
            (group) => group.id === currentRoomId
        )
    ) {
        groups.push({
            id: currentRoomId,
            title: currentRoomTitle,
            memberCount: currentMemberCount,
            unreadCount: 0,
        });
    }

    return groups;
}
