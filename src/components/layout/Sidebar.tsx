import AppMenu from "./AppMenu";
import styles from "./Sidebar.module.css";
export type SidebarGroup = {
    id: string;
    title: string;
    memberCount: number;
    lastActivity?: string;
};

type SidebarProps = {
    groups: SidebarGroup[];
    selectedGroupId: string | null;
    onSelectGroup: (id: string) => void;
    theme: "light" | "dark";
    onThemeChange: (theme: "light" | "dark") => void;
};

export default function Sidebar({
    groups,
    selectedGroupId,
    onSelectGroup,
    theme,
    onThemeChange,
}: SidebarProps) {
    return (
        <div className={styles.sidebar}>
            <div className={styles.brand}>
                <AppMenu
                    theme={theme}
                    onThemeChange={onThemeChange}
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
                                <span className={styles.groupTitle}>
                                    {group.title}
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
        </div>
    );
}
