import { formatDate, formatMoney } from "../format";
import styles from "./revenue-chart.module.scss";
import type { Revenue } from "../types";

export function RevenueChart({ revenues }: { revenues: Revenue[] }) {
  const ordered = [...revenues].sort((a, b) => a.date.localeCompare(b.date));
  const values = ordered.map((item) => Number(item.amount));
  const max = Math.max(...values, 1);
  const points = values
    .map(
      (value, index) =>
        `${ordered.length === 1 ? 50 : (index / (ordered.length - 1)) * 100},${92 - (value / max) * 80}`,
    )
    .join(" ");
  return (
    <section className={styles.card} aria-label="Evolução das receitas">
      <header className={styles.cardHeader}>
        <h3>Ritmo das entradas</h3>
        <small>{revenues.length} receitas</small>
      </header>
      {ordered.length === 0 ? (
        <p className={styles.empty}>Nenhuma receita neste período.</p>
      ) : (
        <div className={styles.trend}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-label="Gráfico de receitas por data"
          >
            <polygon
              className={styles.trendArea}
              points={`0,100 ${points} 100,100`}
            />
            <polyline
              className={styles.trendLine}
              points={points}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className={styles.trendLabels}>
            <span>{formatDate(ordered[0].date)}</span>
            <strong>
              {formatMoney(
                values.reduce((sum, value) => sum + value, 0).toFixed(2),
              )}
            </strong>
            <span>{formatDate(ordered.at(-1)!.date)}</span>
          </div>
        </div>
      )}
    </section>
  );
}
