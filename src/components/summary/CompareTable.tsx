
"use client";

import { useMemo, useState } from "react";
import type { SummaryRow } from "@/lib/summary/buildSummary";
import styles from "./CompareTable.module.css";

type CompareTableProps = {
    rows: SummaryRow[];
};

type SortMode =
    | "original"
    | "pro-desc"
    | "con-asc"
    | "unresolved-desc";

const solutionCount = (row: SummaryRow): number =>
    row.problems.reduce(
        (total, problem) => total + problem.solutions.length,
        0
    );

const unresolvedScore = (row: SummaryRow): number =>
    row.problems.length - solutionCount(row);

export default function CompareTable({
    rows,
}: CompareTableProps) {
    const [sortMode, setSortMode] =
        useState<SortMode>("original");

    const sortedRows = useMemo(() => {
        const entries = rows.map((row, index) => ({
            row,
            index,
        }));

        entries.sort((a, b) => {
            let difference = 0;

            switch (sortMode) {
                case "pro-desc":
                    difference = b.row.pro - a.row.pro;
                    break;

                case "con-asc":
                    difference = a.row.con - b.row.con;
                    break;

                case "unresolved-desc":
                    difference =
                        unresolvedScore(b.row) -
                        unresolvedScore(a.row);
                    break;

                case "original":
                    break;
            }

            // 同点の場合は元の発案順を維持
            return difference !== 0
                ? difference
                : a.index - b.index;
        });

        return entries.map(entry => entry.row);
    }, [rows, sortMode]);

    if (rows.length === 0) {
        return (
            <p className={styles.empty}>
                比較できるアイデアはまだありません。
            </p>
        );
    }

    return (
        <div>
            <div className={styles.sortBar}>
                <label
                    htmlFor="thync-summary-sort"
                    className={styles.sortLabel}
                >
                    並び順
                </label>

                <select
                    id="thync-summary-sort"
                    className={styles.sortSelect}
                    value={sortMode}
                    onChange={event =>
                        setSortMode(event.target.value as SortMode)
                    }
                >
                    <option value="original">
                        発案順
                    </option>
                    <option value="pro-desc">
                        賛成数が多い順
                    </option>
                    <option value="con-asc">
                        反対数が少ない順
                    </option>
                    <option value="unresolved-desc">
                        問題数 − 解決策数が多い順
                    </option>
                </select>
            </div>

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
                        {sortedRows.map(row => (
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
                                    {solutionCount(row)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
