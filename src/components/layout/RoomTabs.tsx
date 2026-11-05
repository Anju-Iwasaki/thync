
import styles from "./RoomTabs.module.css";

export type RoomTab = "talk" | "thync" | "summary";

type RoomTabsProps = {
    activeTab: RoomTab;
    onChangeTab: (tab: RoomTab) => void;
};

const tabs: { id: RoomTab; label: string }[] = [
    { id: "talk", label: "Talk" },
    { id: "thync", label: "THYNC" },
    { id: "summary", label: "Summary" },
];

export default function RoomTabs({
    activeTab,
    onChangeTab,
}: RoomTabsProps) {
    return (
        <div className={styles.tabList}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        type="button"
                        className={`${styles.tab} ${isActive ? styles.active : ""
                            }`}
                        onClick={() => onChangeTab(tab.id)}
                        aria-current={isActive ? "page" : undefined}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
