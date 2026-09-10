import { formatMoney } from "../format";
import styles from "./financial-summary.module.scss";
import type { FinancialSummaryOutput } from "../types";

export function FinancialSummary({
  output,
}: {
  output: FinancialSummaryOutput;
}) {
  const result = Number(output.result);
  return (
    <section className={styles.card} aria-label="Resumo financeiro">
      <header className={styles.cardHeader}>
        <h3>Resumo financeiro</h3>
        <small>Retrato da consulta</small>
      </header>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <span>Entradas</span>
          <strong>{formatMoney(output.totalRevenues)}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Saídas</span>
          <strong>{formatMoney(output.totalExpenses)}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Resultado</span>
          <strong className={result >= 0 ? styles.positive : styles.negative}>
            {formatMoney(output.result)}
          </strong>
        </div>
      </div>
    </section>
  );
}
