
/**
 * Room画面への遷移先を一元管理する。
 *
 * 現在はUI検証用ルートを使用。
 * ボスによる本番Room画面の切替が完了したら、
 * ROOM_ROUTE_BASE を "/room" に変更する。
 */
export const ROOM_ROUTE_BASE = "/room" as const;

/** 指定したRoom IDの画面URLを返す */
export function roomPath(roomId: string): string {
    return `${ROOM_ROUTE_BASE}/${encodeURIComponent(roomId)}`;
}
