
"use client";

import { supabase } from "@/lib/supabase/browser";
import { DEFAULT_ANALYSIS_MODE } from "@/constants";
import {
    getSavedMemberId,
    saveMembership,
} from "@/lib/client/roomMembership";
import type { GroupAddRequest } from "@/components/layout/GroupAddDialog";

/**
 * Roomの作成・参加を共通化する。
 *
 * トップページとRoom内サイドバーの両方から利用する。
 * 画面遷移は呼び出し元が担当する。
 *
 * 戻り値: 作成・参加したRoomのID
 */
export async function createOrJoinRoom(
    request: GroupAddRequest
): Promise<string> {
    let targetRoomId: string;

    if (request.mode === "create") {
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
        let parsed: URL;

        try {
            parsed = new URL(request.url);
        } catch {
            throw new Error("共有URLが正しくありません。");
        }

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

        // すでに参加している場合は再登録しない
        if (getSavedMemberId(targetRoomId)) {
            return targetRoomId;
        }
    }

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

    saveMembership(targetRoomId, member.id);

    // ボスの既存デモ画面との互換性を維持
    try {
        sessionStorage.setItem(
            `thync:member:${targetRoomId}`,
            member.id
        );
    } catch {
        // localStorageでの保存が成功していれば継続可能
    }

    return targetRoomId;
}
