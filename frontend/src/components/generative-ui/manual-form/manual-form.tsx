import { useState, type FormEvent } from "react";
import { expenseCategories } from "../format";
import styles from "./manual-form.module.scss";
import type { ManualFormOutput, ToolPart } from "../types";

type ManualFormProps = {
  part: ToolPart;
  onSubmit(output: ManualFormOutput): void;
};

export function ManualForm({ part, onSubmit }: ManualFormProps) {
  const kind =
    (part.input as { kind?: unknown } | undefined)?.kind === "revenue"
      ? "revenue"
      : "expense";
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("OTHER");

  if (part.state === "output-available")
    return (
      <p className={styles.fallback}>
        Dados enviados ao assistente para conferência.
      </p>
    );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      kind,
      amount,
      date,
      description,
      ...(kind === "expense" ? { category } : {}),
    });
  }

  return (
    <section className={styles.card} aria-label="Formulário manual">
      <header className={styles.cardHeader}>
        <h3>{kind === "expense" ? "Anotar despesa" : "Anotar receita"}</h3>
        <small>Preenchimento manual</small>
      </header>
      <form className={styles.manualForm} onSubmit={submit}>
        <label className={styles.field}>
          Valor
          <input
            required
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          Data
          <input
            required
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className={styles.fieldWide}>
          Descrição
          <input
            required
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        {kind === "expense" && (
          <label className={styles.fieldWide}>
            Categoria
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {expenseCategories.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className={styles.formSubmit} type="submit">
          Revisar com o assistente
        </button>
      </form>
    </section>
  );
}
