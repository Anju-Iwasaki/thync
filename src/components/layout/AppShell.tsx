
"use client";

import {
    useRef,
    useState,
    type ReactNode,
    type TouchEvent,
} from "react";
import "../../styles/theme.css";
import styles from "./AppShell.module.css";

type AppShellProps = {
    sidebar: ReactNode;
    header: ReactNode;
    tabs: ReactNode;
    children: ReactNode;

    theme?: "light" | "dark";
    accentPalette?: "neutral" | "sky" | "mint" | "rose";
    fontSizeMode?: "small" | "normal" | "large";
};


export default function AppShell({
    sidebar,
    header,
    tabs,
    children,

    theme = "light",
    accentPalette = "neutral",
    fontSizeMode = "normal",
}: AppShellProps) {

    const [sidebarOpen, setSidebarOpen] = useState(true);

    // スワイプ開始位置を記録
    const touchStart = useRef<{
        x: number;
        y: number;
    } | null>(null);

    const handleTouchStart = (
        event: TouchEvent<HTMLDivElement>
    ) => {
        if (!sidebarOpen || event.touches.length !== 1) {
            touchStart.current = null;
            return;
        }

        touchStart.current = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
        };
    };

    const handleTouchEnd = (
        event: TouchEvent<HTMLDivElement>
    ) => {
        const start = touchStart.current;
        touchStart.current = null;

        if (!sidebarOpen || !start) return;
        if (event.changedTouches.length !== 1) return;

        const end = event.changedTouches[0];

        const deltaX = end.clientX - start.x;
        const deltaY = end.clientY - start.y;

        // 左方向へ80px以上、縦移動は50px未満
        if (deltaX < -80 && Math.abs(deltaY) < 50) {
            setSidebarOpen(false);
        }
    };

    return (

        <div
            className={`thync-shell ${styles.shell}`}

            data-theme={theme}
            data-accent-palette={accentPalette}
            data-font-size={fontSizeMode}
            data-sidebar-open={sidebarOpen}

        >
            <aside
                className={styles.sidebar}
                id="thync-sidebar"
                aria-label="グループ一覧"
            >
                {sidebar}
            </aside>

            <button
                className={styles.sidebarToggle}
                type="button"
                aria-label={
                    sidebarOpen
                        ? "グループ一覧を閉じる"
                        : "グループ一覧を開く"
                }
                aria-expanded={sidebarOpen}
                aria-controls="thync-sidebar"
                onClick={() => setSidebarOpen((prev) => !prev)}
            >
                {sidebarOpen ? "‹" : "›"}
            </button>

            <div
                className={styles.main}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={() => {
                    touchStart.current = null;
                }}
            >
                <header className={styles.header}>
                    {header}
                </header>

                <main className={styles.content}>
                    {children}
                </main>

                <nav
                    className={styles.tabs}
                    aria-label="ルーム切り替え"
                >
                    {tabs}
                </nav>
            </div>
        </div>
    );
}
