
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
};


export default function AppMenu({
    theme,

    onThemeChange,
    accentPalette,
    onAccentPaletteChange,
    fontSizeMode,
    onFontSizeChange,
    debugActions = [],

    boardLineStyle,
    onBoardLineStyleChange,
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

                    {/* THYNCボードの接続線スタイル */}
                    {boardLineStyle && onBoardLineStyleChange && (
                        <div className={styles.boardStyleSection}>
                            <div className={styles.sectionTitle}>
                                THYNC 接続線
                            </div>

                            <div
                                className={styles.boardStyleOptions}
                                role="group"
                                aria-label="THYNC接続線スタイル"
                            >
                                <button
                                    type="button"
                                    className={`${styles.boardStyleButton} ${boardLineStyle === "rounded"
                                        ? styles.boardStyleSelected
                                        : ""
                                        }`}
                                    aria-pressed={boardLineStyle === "rounded"}
                                    onClick={() =>
                                        onBoardLineStyleChange("rounded")
                                    }
                                >
                                    構造的
                                </button>

                                <button
                                    type="button"
                                    className={`${styles.boardStyleButton} ${boardLineStyle === "soft"
                                        ? styles.boardStyleSelected
                                        : ""
                                        }`}
                                    aria-pressed={boardLineStyle === "soft"}
                                    onClick={() =>
                                        onBoardLineStyleChange("soft")
                                    }
                                >
                                    有機的
                                </button>
                            </div>
                        </div>
                    )}


                    {/* Talkの配色プリセット */}
                    {accentPalette && onAccentPaletteChange && (
                        <div className={styles.preferenceSection}>
                            <div className={styles.sectionTitle}>
                                Talkの配色
                            </div>

                            <div className={styles.paletteList}>
                                {([
                                    ["neutral", "モノクロ"],
                                    ["sky", "スカイ"],
                                    ["mint", "ミント"],
                                    ["rose", "ローズ"],
                                ] as const).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        data-palette={value}
                                        className={[
                                            styles.paletteOption,
                                            accentPalette === value
                                                ? styles.paletteSelected
                                                : "",
                                        ].join(" ")}
                                        aria-pressed={accentPalette === value}
                                        onClick={() =>
                                            onAccentPaletteChange(value)
                                        }
                                    >
                                        <span className={styles.paletteName}>
                                            {label}
                                        </span>

                                        <span className={styles.palettePreviewRow}>
                                            <span className={styles.paletteSwatchLight} />
                                            <span className={styles.paletteSwatchDark} />
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 文字サイズ */}
                    {fontSizeMode && onFontSizeChange && (
                        <div className={styles.preferenceSection}>
                            <div className={styles.sectionTitle}>
                                文字サイズ
                            </div>

                            <div className={styles.fontOptions}>
                                {([
                                    ["small", "小"],
                                    ["normal", "標準"],
                                    ["large", "大"],
                                ] as const).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={[
                                            styles.fontButton,
                                            fontSizeMode === value
                                                ? styles.fontSelected
                                                : "",
                                        ].join(" ")}
                                        aria-pressed={fontSizeMode === value}
                                        onClick={() =>
                                            onFontSizeChange(value)
                                        }
                                    >
                                        {label}
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
