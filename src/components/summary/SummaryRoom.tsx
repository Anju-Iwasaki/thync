
import type { Member } from "@/types/rows";
import type { SummaryRow } from "@/lib/summary/buildSummary";
import CompareTable from "./CompareTable";
import styles from "./SummaryRoom.module.css";

type Insight = {
    text: string;
    ideaIds: string[];
};

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
        return members.find(
            member => member.id === memberId
        )?.nickname ?? "不明なユーザー";
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
                                <details
                                    className={styles.ideaCard}
                                    key={idea.ideaId}
                                    open={undefined}
                                >
                                    <summary className={styles.ideaToggle}>
                                        <div className={styles.ideaToggleContent}>
                                            <h4 className={styles.ideaTitle}>
                                                {idea.label}
                                            </h4>

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
                                        </div>

                                        <span
                                            className={styles.expandIcon}
                                            aria-hidden="true"
                                        >
                                            <span className={styles.expandChevron}>
                                                ⌄
                                            </span>
                                        </span>
                                    </summary>

                                    <div className={styles.ideaBody}>
                                        <div className={styles.proposer}>
                                            発案：
                                            {findMemberName(idea.proposerId)}
                                        </div>


                                        {idea.reasons.length > 0 && (
                                            <div className={styles.detailGroup}>
                                                <h5 className={styles.detailTitle}>
                                                    賛成理由
                                                </h5>

                                                <div className={styles.reasonList}>
                                                    {idea.reasons.map((reason, index) => (
                                                        <div
                                                            className={styles.reasonCard}
                                                            key={index}
                                                        >
                                                            <span
                                                                className={styles.reasonMarker}
                                                                aria-hidden="true"
                                                            />
                                                            <span>{reason}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}



                                        {idea.problems.length > 0 && (
                                            <div className={styles.problemList}>
                                                <h5 className={styles.problemTitle}>
                                                    問題点
                                                </h5>
                                                {idea.problems.map(problem => (

                                                    <div
                                                        className={styles.problem}
                                                        key={problem.id}
                                                    >
                                                        <div className={styles.problemLabel}>
                                                            <span
                                                                className={styles.problemMarker}
                                                                aria-hidden="true"
                                                            />
                                                            <span>{problem.label}</span>
                                                        </div>


                                                        {problem.solutions.length > 0 && (
                                                            <details className={styles.solutionAccordion}>
                                                                <summary className={styles.solutionToggle}>
                                                                    <span
                                                                        className={styles.solutionMarker}
                                                                        aria-hidden="true"
                                                                    />
                                                                    <span className={styles.solutionToggleLabel}>
                                                                        解決策
                                                                        <span className={styles.solutionCount}>
                                                                            {problem.solutions.length}件
                                                                        </span>
                                                                    </span>
                                                                    <span
                                                                        className={styles.solutionChevron}
                                                                        aria-hidden="true"
                                                                    >
                                                                        ⌄
                                                                    </span>
                                                                </summary>

                                                                <div className={styles.solutionCards}>
                                                                    {problem.solutions.map((solution, index) => (
                                                                        <div
                                                                            className={styles.solutionCard}
                                                                            key={index}
                                                                        >
                                                                            <span
                                                                                className={styles.solutionCardMarker}
                                                                                aria-hidden="true"
                                                                            />
                                                                            <span>{solution}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </details>
                                                        )}

                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {idea.reasons.length === 0 &&
                                            idea.problems.length === 0 && (
                                                <p className={styles.noDetails}>
                                                    まだ理由・問題点は登録されていません。
                                                </p>
                                            )}
                                    </div>
                                </details>
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
