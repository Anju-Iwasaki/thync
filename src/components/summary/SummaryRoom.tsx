import type { Member } from "@/types/rows";
import type { SummaryRow } from "@/lib/summary/buildSummary";
import CompareTable from "./CompareTable";

type Insight = {
    text: string;
    ideaIds: string[];
};
import styles from "./SummaryRoom.module.css";

type SummaryRoomProps = {
    rows: SummaryRow[];
    members: Member[];
    insights?: Insight[];
};

export default function SummaryRoom({
    rows,
    members,
    insights = [],
}: SummaryRoomProps) {
    const findMemberName = (memberId: string) => {
        return (
            members.find((member) => member.id === memberId)
                ?.nickname ?? "不明なユーザー"
        );
    };

    return (
        <div className={styles.summaryRoom}>
            <div className={styles.container}>
                <header className={styles.pageHeader}>
                    <h2 className={styles.pageTitle}>
                        Summary
                    </h2>
                    <p className={styles.description}>
                        議論で生まれたアイデアと意見を整理します。
                    </p>
                </header>

                {insights.length > 0 && (
                    <section
                        className={styles.section}
                        aria-labelledby="summary-insights"
                    >
                        <h3
                            className={styles.sectionTitle}
                            id="summary-insights"
                        >
                            AIの気づき
                        </h3>

                        <div className={styles.insightBox}>
                            {insights.map((insight, index) => (
                                <p
                                    className={styles.insightText}
                                    key={`${insight.ideaIds.join("-")}-${index}`}
                                >
                                    {insight.text}
                                </p>
                            ))}
                        </div>
                    </section>
                )}

                <section
                    className={styles.section}
                    aria-labelledby="summary-ideas"
                >
                    <h3
                        className={styles.sectionTitle}
                        id="summary-ideas"
                    >
                        今出ている案
                    </h3>

                    {rows.length === 0 ? (
                        <div className={styles.emptyState}>
                            まだ整理されたアイデアはありません。
                        </div>
                    ) : (
                        <div className={styles.ideaList}>
                            {rows.map((idea) => (
                                <article
                                    className={styles.ideaCard}
                                    key={idea.ideaId}
                                >
                                    <div className={styles.ideaHeader}>
                                        <h4 className={styles.ideaTitle}>
                                            {idea.label}
                                        </h4>

                                        <span className={styles.proposer}>
                                            発案：
                                            {findMemberName(
                                                idea.proposerId
                                            )}
                                        </span>
                                    </div>

                                    <div className={styles.voteRow}>
                                        <span className={styles.vote}>
                                            賛成
                                            <strong>{idea.pro}</strong>
                                        </span>
                                        <span className={styles.vote}>
                                            反対
                                            <strong>{idea.con}</strong>
                                        </span>
                                    </div>

                                    {idea.reasons.length > 0 && (
                                        <div className={styles.detailGroup}>
                                            <h5 className={styles.detailTitle}>
                                                賛成理由
                                            </h5>

                                            <ul className={styles.detailList}>
                                                {idea.reasons.map(
                                                    (reason, index) => (
                                                        <li key={index}>
                                                            {reason}
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        </div>
                                    )}

                                    {idea.problems.length > 0 && (
                                        <div className={styles.problemList}>
                                            {idea.problems.map((problem) => (
                                                <div
                                                    className={styles.problem}
                                                    key={problem.id}
                                                >
                                                    <div className={styles.problemLabel}>
                                                        <span
                                                            className={styles.problemMarker}
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            {problem.label}
                                                        </span>
                                                    </div>

                                                    {problem.solutions.length >
                                                        0 && (
                                                            <div
                                                                className={
                                                                    styles.solutionGroup
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.solutionHeading
                                                                    }
                                                                >
                                                                    解決策
                                                                </span>

                                                                <ul
                                                                    className={
                                                                        styles.solutionList
                                                                    }
                                                                >
                                                                    {problem.solutions.map(
                                                                        (
                                                                            solution,
                                                                            index
                                                                        ) => (
                                                                            <li
                                                                                key={
                                                                                    index
                                                                                }
                                                                            >
                                                                                {
                                                                                    solution
                                                                                }
                                                                            </li>
                                                                        )
                                                                    )}
                                                                </ul>
                                                            </div>
                                                        )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section
                    className={styles.section}
                    aria-labelledby="summary-comparison"
                >
                    <h3
                        className={styles.sectionTitle}
                        id="summary-comparison"
                    >
                        比較表
                    </h3>

                    <CompareTable rows={rows} />
                </section>
            </div>
        </div>
    );
}
