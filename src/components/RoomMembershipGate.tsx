
"use client";

import { useEffect, useState, type ReactNode } from "react";

import JoinForm from "./JoinForm";
import { supabase } from "@/lib/supabase/browser";
import {
    useRoom,
    type RoomData,
} from "@/client/useRoom";

import {
    getSavedMemberId,
    saveMembership,
} from "@/lib/client/roomMembership";

type RoomMembershipGateProps = {
    roomId: string;
    children: (
        memberId: string,
        roomData: RoomData
    ) => ReactNode;
};

const memberKey = (roomId: string) =>
    `thync:member:${roomId}`;

export default function RoomMembershipGate({
    roomId,
    children,
}: RoomMembershipGateProps) {
    const roomData = useRoom(roomId);
    const { room, error } = roomData;

    const [memberId, setMemberId] =
        useState<string | null>(null);

    const [ready, setReady] = useState(false);

    // 保存済み参加情報を復元
    useEffect(() => {
        const timer = window.setTimeout(() => {
            let savedId = getSavedMemberId(roomId);

            // 旧sessionStorageからの移行
            if (!savedId) {
                try {
                    savedId = sessionStorage.getItem(
                        memberKey(roomId)
                    );
                } catch {
                    savedId = null;
                }

                if (savedId) {
                    saveMembership(roomId, savedId);
                }
            }

            setMemberId(savedId);
            setReady(true);
        }, 0);

        return () => window.clearTimeout(timer);
    }, [roomId]);

    // 新規参加
    const handleJoin = async (
        targetRoomId: string,
        nickname: string
    ) => {
        const { data, error: joinError } = await supabase
            .from("members")
            .insert({
                room_id: targetRoomId,
                nickname,
            })
            .select()
            .single();

        if (joinError) {
            throw joinError;
        }

        // タブを閉じても復帰できるよう保存
        saveMembership(targetRoomId, data.id);

        // 既存デモとの互換性も維持
        try {
            sessionStorage.setItem(
                memberKey(targetRoomId),
                data.id
            );
        } catch { }

        setMemberId(data.id);
    };

    if (!ready || (!room && !error)) {
        return <p>ルームを読み込み中...</p>;
    }

    if (!room) {
        return (
            <p role="alert">
                ルームを読み込めませんでした。
                {error ? ` ${error}` : ""}
            </p>
        );
    }

    if (!memberId) {
        return (
            <JoinForm
                roomId={roomId}
                topic={room.topic}
                onJoin={handleJoin}
            />
        );
    }

    return <>{children(memberId, roomData)}</>;
}