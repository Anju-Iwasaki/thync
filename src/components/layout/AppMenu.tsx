
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./AppMenu.module.css";


type Theme = "light" | "dark";

export type DebugAction = {
    label: string;
    onClick: () => void;
};

type AppMenuProps = {
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
    debugActions?: DebugAction[];
};


export default function AppMenu({
    theme,
    onThemeChange,
    debugActions = [],
}: AppMenuProps) {

    const [isOpen, setIsOpen] = useState(false);

    // メニュー全体の要素を参照する
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        // メニュー以外を押した場合に閉じる
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;

            if (
                target instanceof Node &&
                !menuRef.current?.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        // Escキーでも閉じる
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener(
            "pointerdown",
            handlePointerDown
        );

        document.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            document.removeEventListener(
                "pointerdown",
                handlePointerDown
            );

            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [isOpen]);

    return (
        <div
            ref={menuRef}
            className={styles.container}
        >
            <button
                type="button"
                className={styles.menuButton}
                aria-label="アプリメニュー"
                aria-expanded={isOpen}
                aria-controls="thync-app-menu"
                onClick={() => setIsOpen((prev) => !prev)}
            >
                <span className={styles.menuIcon} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                </span>
            </button>

            {isOpen && (
                <div
                    id="thync-app-menu"
                    className={styles.popup}
                >
                    <div className={styles.sectionTitle}>
                        外観
                    </div>

                    <div
                        className={styles.themeOptions}
                        role="group"
                        aria-label="カラーテーマ"
                    >
                        <button
                            type="button"
                            className={`${styles.themeButton} ${theme === "light" ? styles.selected : ""
                                }`}
                            aria-pressed={theme === "light"}
                            onClick={() => onThemeChange("light")}
                        >
                            <span aria-hidden="true">☀</span>
                            <span>ライト</span>
                        </button>

                        <button
                            type="button"
                            className={`${styles.themeButton} ${theme === "dark" ? styles.selected : ""
                                }`}
                            aria-pressed={theme === "dark"}
                            onClick={() => onThemeChange("dark")}
                        >
                            <span aria-hidden="true">☾</span>
                            <span>ダーク</span>

                        </button>
                    </div>

                    {debugActions.length > 0 && (
                        <div className={styles.debugSection}>
                            <div className={styles.sectionTitle}>
                                デバッグ
                            </div>

                            <div className={styles.debugActions}>
                                {debugActions.map((action) => (
                                    <button
                                        key={action.label}
                                        type="button"
                                        className={styles.debugButton}
                                        onClick={() => {
                                            action.onClick();
                                            setIsOpen(false);
                                        }}
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
