import { categoryLabel, formatMoney } from "../format";
import styles from "./expense-chart.module.scss";
import type { FinancialSummaryOutput } from "../types";

export function ExpenseChart({
  items,
}: {
  items: FinancialSummaryOutput["expensesByCategory"];
}) {
  const max = Math.max(...items.map((item) => Number(item.amount)), 0);
  return (
    <section className={styles.card} aria-label="Despesas por categoria">
      <header className={styles.cardHeader}>
        <h3>Onde o dinheiro saiu</h3>
        <small>Por categoria</small>
      </header>
      {items.length === 0 ? (
        <p className={styles.empty}>Nenhuma despesa neste período.</p>
      ) : (
        <div className={styles.bars}>
          {items.map((item) => (
            <div key={item.category}>
              <div className={styles.barLabel}>
                <span>{categoryLabel(item.category)}</span>
                <strong>{formatMoney(item.amount)}</strong>
              </div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{
                    width: `${max ? (Number(item.amount) / max) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
