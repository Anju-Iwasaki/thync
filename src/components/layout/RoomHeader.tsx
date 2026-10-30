
import styles from "./RoomHeader.module.css";

type RoomHeaderProps = {
    title: string;
    memberCount: number;
};

export default function RoomHeader({
    title,
    memberCount,
}: RoomHeaderProps) {
    return (
        <div className={styles.headerContent}>
            <div className={styles.topic}>
                <span className={styles.topicTitle} title={title}>
                    {title}
                </span>
            </div>

            <div
                className={styles.members}
                aria-label={`参加人数 ${memberCount}人`}
            >
                <span className={styles.memberCount}>
                    {memberCount}人
                </span>
            </div>
        </div>
    );
}
