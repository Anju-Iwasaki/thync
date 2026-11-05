
import type { SummaryRow } from "@/lib/summary/buildSummary";
import styles from "./CompareTable.module.css";

type CompareTableProps = {
    rows: SummaryRow[];
};

export default function CompareTable({
    rows,
}: CompareTableProps) {
    if (rows.length === 0) {
        return (
            <p className={styles.empty}>
                比較できるアイデアはまだありません。
            </p>
        );
    }

    return (
        <div className={styles.tableScroll}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th scope="col">アイデア</th>
                        <th scope="col">賛成</th>
                        <th scope="col">反対</th>
                        <th scope="col">問題点</th>
                        <th scope="col">解決策</th>
                    </tr>
                </thead>

                <tbody>
                    {rows.map((row) => {
                        const solutionCount = row.problems.reduce(
                            (total, problem) =>
                                total + problem.solutions.length,
                            0
                        );

                        return (
                            <tr key={row.ideaId}>
                                <th scope="row">
                                    {row.label}
                                </th>
                                <td className={styles.number}>
                                    {row.pro}
                                </td>
                                <td className={styles.number}>
                                    {row.con}
                                </td>
                                <td className={styles.number}>
                                    {row.problems.length}
                                </td>
                                <td className={styles.number}>
                                    {solutionCount}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
