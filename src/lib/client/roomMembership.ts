
/**
 * THYNC UI側：参加ルーム情報の保存・復元
 *
 * roomId と memberId を対応付けて保存する。
 * Supabaseへの登録処理は行わない。
 */

// RoomDev.tsx と同じキー形式
const PREFIX = "thync:member:";

export type SavedMembership = {
    roomId: string;
    memberId: string;
};

// 参加済みのメンバーIDを取得
export function getSavedMemberId(
    roomId: string
): string | null {
    if (typeof window === "undefined") return null;

    try {
        return localStorage.getItem(PREFIX + roomId);
    } catch {
        return null;
    }
}

// 参加情報を保存・更新
export function saveMembership(
    roomId: string,
    memberId: string
): void {
    if (typeof window === "undefined") return;

    try {
        localStorage.setItem(PREFIX + roomId, memberId);
    } catch {
        // 保存できない環境では何もしない
    }
}

// 保存されている参加ルームを一覧取得
export function getSavedMemberships(): SavedMembership[] {
    if (typeof window === "undefined") return [];

    try {
        const memberships: SavedMembership[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            if (!key?.startsWith(PREFIX)) continue;

            const roomId = key.slice(PREFIX.length);
            const memberId = localStorage.getItem(key);

            if (roomId && memberId) {
                memberships.push({ roomId, memberId });
            }
        }

        return memberships;
    } catch {
        return [];
    }
}

// UI上で参加履歴を消す場合
// ※Supabase上のメンバーは削除しない
export function removeSavedMembership(
    roomId: string
): void {
    if (typeof window === "undefined") return;

    try {
        localStorage.removeItem(PREFIX + roomId);
    } catch {
        // 保存領域へアクセスできない場合
    }
}
