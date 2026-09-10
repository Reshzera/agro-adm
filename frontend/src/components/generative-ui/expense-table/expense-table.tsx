import { categoryLabel, formatDate, formatMoney } from "../format";
import styles from "./expense-table.module.scss";
import type { Expense } from "../types";

export function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  return (
    <section className={styles.card} aria-label="Lista de despesas">
      <header className={styles.cardHeader}>
        <h3>Despesas encontradas</h3>
        <small>{expenses.length} lançamentos</small>
      </header>
      {expenses.length === 0 ? (
        <p className={styles.empty}>Nenhuma despesa encontrada.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{formatDate(expense.date)}</td>
                  <td>{expense.description}</td>
                  <td>{categoryLabel(expense.category)}</td>
                  <td>{formatMoney(expense.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
