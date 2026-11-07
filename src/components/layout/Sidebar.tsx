"use client";

import { useState } from "react";
import AppMenu from "./AppMenu";
import GroupAddDialog, {
    type GroupAddRequest,
} from "./GroupAddDialog";
import styles from "./Sidebar.module.css";


export type SidebarGroup = {
    id: string;
    title: string;
    memberCount: number;
    lastActivity?: string;
    unreadCount?: number;
};

// AppMenuに渡すデバッグ操作の型
type DebugAction = {
    label: string;
    onClick: () => void;
};

type SidebarProps = {

    groups: SidebarGroup[];
    selectedGroupId: string | null;
    onSelectGroup: (id: string) => void;
    theme: "light" | "dark";

    onThemeChange: (theme: "light" | "dark") => void;

    accentPalette?: "neutral" | "sky" | "mint" | "rose";
    onAccentPaletteChange?: (
        palette: "neutral" | "sky" | "mint" | "rose"
    ) => void;

    fontSizeMode?: "small" | "normal" | "large";
    onFontSizeChange?: (
        size: "small" | "normal" | "large"
    ) => void;

    debugActions?: DebugAction[];


    boardLineStyle?: "soft" | "rounded";
    onBoardLineStyleChange?: (
        style: "soft" | "rounded"
    ) => void;

    onAddGroup?: (
        request: GroupAddRequest
    ) => void | Promise<void>;
};

export default function Sidebar({
    groups,
    selectedGroupId,
    onSelectGroup,
    theme,
    onThemeChange,
    accentPalette,
    onAccentPaletteChange,
    fontSizeMode,
    onFontSizeChange,
    debugActions,
    boardLineStyle,
    onBoardLineStyleChange,
    onAddGroup,
}: SidebarProps) {
    const [isGroupAddOpen, setIsGroupAddOpen] =
        useState(false);

    return (
        <div className={styles.sidebar}>
            <div className={styles.brand}>
                <AppMenu
                    theme={theme}

                    onThemeChange={onThemeChange}
                    accentPalette={accentPalette}
                    onAccentPaletteChange={onAccentPaletteChange}
                    fontSizeMode={fontSizeMode}
                    onFontSizeChange={onFontSizeChange}
                    debugActions={debugActions}

                    boardLineStyle={boardLineStyle}
                    onBoardLineStyleChange={onBoardLineStyleChange}
                />

                <div className={styles.brandText}>
                    <h1 className={styles.logo}>THYNC</h1>
                    <span className={styles.tagline}>
                        THINK × SYNC
                    </span>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <span>グループ</span>
                    <span className={styles.groupCount}>
                        {groups.length}
                    </span>
                </div>

                <div className={styles.groupList}>
                    {groups.length === 0 ? (
                        <p className={styles.empty}>
                            参加中のグループはありません
                        </p>
                    ) : (
                        groups.map((group) => (
                            <button
                                key={group.id}
                                type="button"
                                className={`${styles.group} ${selectedGroupId === group.id
                                    ? styles.active
                                    : ""
                                    }`}
                                onClick={() => onSelectGroup(group.id)}
                                aria-current={
                                    selectedGroupId === group.id
                                        ? "page"
                                        : undefined
                                }
                            >

                                <span className={styles.groupHeader}>
                                    <span className={styles.groupTitle}>
                                        {group.title}
                                    </span>

                                    {(group.unreadCount ?? 0) > 0 && (
                                        <span
                                            className={styles.unreadBadge}
                                            aria-label={`未読${group.unreadCount}件`}
                                        >
                                            {group.unreadCount! > 99
                                                ? "99+"
                                                : group.unreadCount}
                                        </span>
                                    )}
                                </span>

                                <span className={styles.groupMeta}>
                                    <span>
                                        {group.memberCount}人
                                    </span>

                                    {group.lastActivity && (
                                        <>
                                            <span className={styles.separator}>
                                                ·
                                            </span>
                                            <span>{group.lastActivity}</span>
                                        </>
                                    )}
                                </span>

                            </button>
                        ))
                    )}
                </div>
            </div>

            <button
                type="button"
                className={styles.addGroupButton}
                onClick={() => setIsGroupAddOpen(true)}
            >
                <span
                    className={styles.addGroupIcon}
                    aria-hidden="true"
                >
                    ＋
                </span>
                <span>グループを追加</span>
            </button>

            {isGroupAddOpen && (
                <GroupAddDialog
                    onClose={() => setIsGroupAddOpen(false)}
                    onSubmit={onAddGroup}
                />
            )}
        </div>
    );
}