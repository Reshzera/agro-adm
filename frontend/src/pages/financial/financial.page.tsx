import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { financialEndpoints } from "../../service/financial";
import type {
  FinancialEntryPayload,
  FinancialFilters,
} from "../../service/financial/payloads";
import type {
  EntryType,
  ExpenseCategory,
  FinancialEntry,
} from "../../service/financial/responses";
import styles from "./financial.page.module.scss";

const categories: { value: ExpenseCategory; label: string }[] = [
  { value: "FUEL", label: "Combustível" },
  { value: "FEED_AND_SUPPLEMENT", label: "Ração e suplemento" },
  { value: "FERTILIZER_AND_SEED", label: "Adubo e semente" },
  { value: "PESTICIDE", label: "Defensivo" },
  { value: "ANIMAL_HEALTH", label: "Saúde animal" },
  { value: "PASTURE_AND_CROP_WORK", label: "Pasto e lavoura" },
  { value: "MACHINERY_AND_MAINTENANCE", label: "Máquinas e manutenção" },
  { value: "LABOR", label: "Mão de obra" },
  { value: "OTHER", label: "Outros" },
];

type EntryForm = {
  type: EntryType;
  amount: string;
  date: string;
  description: string;
  category: ExpenseCategory;
  areaId: string;
};

type Editor =
  | { mode: "new"; type: EntryType }
  | { mode: "edit"; entry: FinancialEntry };

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function categoryLabel(value?: ExpenseCategory): string {
  return categories.find((item) => item.value === value)?.label ?? "Receita";
}

function amountValue(value: string): string {
  const trimmed = value.trim();
  return trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
}

function editorValues(editor: Editor): EntryForm {
  if (editor.mode === "new")
    return {
      type: editor.type,
      amount: "",
      date: today(),
      description: "",
      category: "OTHER",
      areaId: "",
    };
  const entry = editor.entry;
  return {
    type: entry.type,
    amount: entry.amount,
    date: entry.date.slice(0, 10),
    description: entry.description,
    category: entry.category ?? "OTHER",
    areaId:
      entry.allocations && entry.allocations.length > 1
        ? "__keep__"
        : (entry.allocations?.[0]?.areaId ?? ""),
  };
}

export function FinancialPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FinancialFilters>({});
  const [editor, setEditor] = useState<Editor | null>(null);
  const entries = useQuery({
    queryKey: ["financial", "entries", filters],
    queryFn: async ({ signal }) =>
      (await financialEndpoints.entries(filters, signal)).data,
  });
  const summary = useQuery({
    queryKey: ["financial", "summary", filters.from, filters.to],
    queryFn: async ({ signal }) =>
      (
        await financialEndpoints.summary(
          { from: filters.from, to: filters.to },
          signal,
        )
      ).data,
  });
  const areas = useQuery({
    queryKey: ["financial", "areas"],
    queryFn: async ({ signal }) =>
      (await financialEndpoints.areas(signal)).data,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["financial"] });
  const remove = useMutation({
    mutationFn: (entry: FinancialEntry) =>
      entry.type === "EXPENSE"
        ? financialEndpoints.deleteExpense(entry.id)
        : financialEndpoints.deleteRevenue(entry.id),
    onSuccess: refresh,
  });

  function askDelete(entry: FinancialEntry) {
    if (
      window.confirm(
        `Excluir “${entry.description}”? Esta ação não pode ser desfeita.`,
      )
    )
      remove.mutate(entry);
  }

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>Livro-caixa · visão geral</p>
          <h1>
            Financeiro
            <br />
            <em>sem neblina.</em>
          </h1>
        </div>
        <div className={styles.newActions}>
          <button onClick={() => setEditor({ mode: "new", type: "REVENUE" })}>
            + Receita
          </button>
          <button
            className={styles.primary}
            onClick={() => setEditor({ mode: "new", type: "EXPENSE" })}
          >
            + Despesa
          </button>
        </div>
      </header>

      <div className={styles.summary} aria-label="Resumo financeiro">
        <SummaryCard
          number="01"
          label="Receitas"
          value={summary.data?.totalRevenues}
          tone="positive"
        />
        <SummaryCard
          number="02"
          label="Despesas"
          value={summary.data?.totalExpenses}
          tone="negative"
        />
        <SummaryCard
          number="03"
          label="Resultado"
          value={summary.data?.result}
          tone={
            Number(summary.data?.result ?? 0) >= 0 ? "positive" : "negative"
          }
          featured
        />
      </div>

      {entries.data && summary.data && (
        <FinancialCharts entries={entries.data} categories={summary.data.expensesByCategory} />
      )}

      <section className={styles.ledger} aria-labelledby="entries-title">
        <header className={styles.ledgerHeader}>
          <div>
            <p className={styles.kicker}>Movimentações</p>
            <h2 id="entries-title">Lançamentos</h2>
          </div>
          <div className={styles.filters}>
            <label>
              <span>De</span>
              <input
                type="date"
                value={filters.from ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    from: event.target.value || undefined,
                  }))
                }
              />
            </label>
            <label>
              <span>Até</span>
              <input
                type="date"
                value={filters.to ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    to: event.target.value || undefined,
                  }))
                }
              />
            </label>
            <label>
              <span>Tipo</span>
              <select
                value={filters.type ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    type: (event.target.value || undefined) as
                      | EntryType
                      | undefined,
                  }))
                }
              >
                <option value="">Todos</option>
                <option value="REVENUE">Receitas</option>
                <option value="EXPENSE">Despesas</option>
              </select>
            </label>
            <label>
              <span>Categoria</span>
              <select
                value={filters.category ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    category: (event.target.value || undefined) as
                      | ExpenseCategory
                      | undefined,
                  }))
                }
              >
                <option value="">Todas</option>
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {entries.isPending ? (
          <p className={styles.status}>Conferindo o livro-caixa…</p>
        ) : entries.isError ? (
          <p className={styles.error}>
            Não foi possível carregar os lançamentos.
          </p>
        ) : entries.data.length === 0 ? (
          <div className={styles.empty}>
            <b>∅</b>
            <p>Nenhum lançamento neste recorte.</p>
            <button onClick={() => setFilters({})}>Limpar filtros</button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Área</th>
                  <th>Valor</th>
                  <th>
                    <span className={styles.srOnly}>Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.data.map((entry) => (
                  <tr key={`${entry.type}-${entry.id}`}>
                    <td>
                      <time dateTime={entry.date}>
                        {date.format(new Date(entry.date))}
                      </time>
                    </td>
                    <td>
                      <span
                        className={styles.typeMark}
                        data-type={entry.type}
                      />
                      {entry.description}
                    </td>
                    <td>{categoryLabel(entry.category)}</td>
                    <td>
                      {entry.type === "REVENUE"
                        ? "Geral"
                        : entry.allocations
                            ?.map(
                              (allocation) => allocation.area?.name ?? "Geral",
                            )
                            .join(" · ")}
                    </td>
                    <td className={styles.amount} data-type={entry.type}>
                      {entry.type === "EXPENSE" ? "− " : "+ "}
                      {money.format(Number(entry.amount))}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          onClick={() => setEditor({ mode: "edit", entry })}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.delete}
                          disabled={remove.isPending}
                          onClick={() => askDelete(entry)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editor && (
        <EntryEditor
          editor={editor}
          areas={areas.data ?? []}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            void refresh();
          }}
        />
      )}
    </section>
  );
}

function SummaryCard({
  number,
  label,
  value,
  tone,
  featured = false,
}: {
  number: string;
  label: string;
  value?: string;
  tone: "positive" | "negative";
  featured?: boolean;
}) {
  return (
    <article className={styles.summaryCard} data-featured={featured}>
      <span>{number}</span>
      <p>{label}</p>
      <strong data-tone={tone}>
        {value === undefined ? "—" : money.format(Number(value))}
      </strong>
    </article>
  );
}

function FinancialCharts({
  entries,
  categories: categoryTotals,
}: {
  entries: FinancialEntry[];
  categories: { category: ExpenseCategory; amount: string }[];
}) {
  const monthly = new Map<string, { revenue: number; expense: number }>();
  for (const entry of entries) {
    const month = entry.date.slice(0, 7);
    const current = monthly.get(month) ?? { revenue: 0, expense: 0 };
    current[entry.type === "REVENUE" ? "revenue" : "expense"] += Number(
      entry.amount,
    );
    monthly.set(month, current);
  }
  const months = [...monthly.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
  const monthlyMax = Math.max(
    1,
    ...months.flatMap(([, values]) => [values.revenue, values.expense]),
  );
  const categoryMax = Math.max(
    1,
    ...categoryTotals.map((item) => Number(item.amount)),
  );
  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });

  return (
    <section className={styles.charts} aria-label="Gráficos financeiros">
      <article>
        <header>
          <div>
            <p className={styles.kicker}>Ritmo do caixa</p>
            <h2>Receitas × despesas</h2>
          </div>
          <div className={styles.legend}>
            <span data-tone="revenue">Receitas</span>
            <span data-tone="expense">Despesas</span>
          </div>
        </header>
        {months.length ? (
          <div className={styles.monthChart}>
            {months.map(([month, values]) => (
              <div className={styles.monthGroup} key={month}>
                <div className={styles.barPair}>
                  <i
                    data-tone="revenue"
                    style={{ height: `${Math.max(2, (values.revenue / monthlyMax) * 100)}%` }}
                    title={`Receitas: ${money.format(values.revenue)}`}
                  />
                  <i
                    data-tone="expense"
                    style={{ height: `${Math.max(2, (values.expense / monthlyMax) * 100)}%` }}
                    title={`Despesas: ${money.format(values.expense)}`}
                  />
                </div>
                <span>{monthLabel.format(new Date(`${month}-01T00:00:00Z`)).replace(" de ", " ")}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.chartEmpty}>Sem dados no período.</p>
        )}
      </article>
      <article>
        <header>
          <div>
            <p className={styles.kicker}>Destino dos recursos</p>
            <h2>Despesas por categoria</h2>
          </div>
        </header>
        <div className={styles.categoryChart}>
          {[...categoryTotals]
            .sort((left, right) => Number(right.amount) - Number(left.amount))
            .slice(0, 5)
            .map((item) => (
              <div key={item.category}>
                <span>{categoryLabel(item.category)}</span>
                <div><i style={{ width: `${(Number(item.amount) / categoryMax) * 100}%` }} /></div>
                <strong>{money.format(Number(item.amount))}</strong>
              </div>
            ))}
          {!categoryTotals.length && <p className={styles.chartEmpty}>Sem despesas no período.</p>}
        </div>
      </article>
    </section>
  );
}

function EntryEditor({
  editor,
  areas,
  onClose,
  onSaved,
}: {
  editor: Editor;
  areas: { id: string; name: string }[];
  onClose(): void;
  onSaved(): void;
}) {
  const defaults = editorValues(editor);
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<EntryForm>({ defaultValues: defaults });
  const type = useWatch({ control, name: "type" });
  const save = useMutation({
    mutationFn: async (values: EntryForm) => {
      const normalizedAmount = amountValue(values.amount);
      const payload: FinancialEntryPayload = {
        amount: normalizedAmount,
        date: values.date,
        description: values.description.trim(),
        source: "MANUAL",
      };
      if (values.type === "EXPENSE") {
        payload.category = values.category;
        if (values.areaId === "__keep__") {
          const original = editor.mode === "edit" ? editor.entry.amount : "";
          if (normalizedAmount !== original) {
            setError("areaId", {
              message:
                "Escolha uma área ao alterar o valor de um lançamento rateado.",
            });
            throw new Error("allocation-required");
          }
          delete payload.amount;
        } else {
          payload.allocations = [
            { areaId: values.areaId || null, amount: normalizedAmount },
          ];
        }
      }
      if (editor.mode === "new")
        return values.type === "EXPENSE"
          ? financialEndpoints.createExpense(payload)
          : financialEndpoints.createRevenue(payload);
      return editor.entry.type === "EXPENSE"
        ? financialEndpoints.updateExpense(editor.entry.id, payload)
        : financialEndpoints.updateRevenue(editor.entry.id, payload);
    },
    onSuccess: onSaved,
  });

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className={styles.editor}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <header>
          <div>
            <p className={styles.kicker}>
              {editor.mode === "new"
                ? "Novo lançamento"
                : "Corrigir lançamento"}
            </p>
            <h2 id="editor-title">
              {editor.mode === "new" ? "Registrar" : "Editar"}{" "}
              {type === "EXPENSE" ? "despesa" : "receita"}
            </h2>
          </div>
          <button
            className={styles.close}
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>
        <form onSubmit={handleSubmit((values) => save.mutate(values))}>
          {editor.mode === "new" && (
            <fieldset className={styles.segmented}>
              <legend>Tipo</legend>
              <label>
                <input type="radio" value="REVENUE" {...register("type")} />
                <span>Receita</span>
              </label>
              <label>
                <input type="radio" value="EXPENSE" {...register("type")} />
                <span>Despesa</span>
              </label>
            </fieldset>
          )}
          <label>
            <span>Descrição</span>
            <input
              autoFocus
              {...register("description", {
                required: "Informe uma descrição.",
              })}
              placeholder="Ex.: Diesel do trator"
            />
            {errors.description && <small>{errors.description.message}</small>}
          </label>
          <div className={styles.formGrid}>
            <label>
              <span>Valor</span>
              <div className={styles.moneyInput}>
                <b>R$</b>
                <input
                  inputMode="decimal"
                  {...register("amount", {
                    required: "Informe o valor.",
                    pattern: {
                      value: /^\d+(?:[.,]\d{1,2})?$/,
                      message: "Use um valor como 1250,00.",
                    },
                  })}
                  placeholder="0,00"
                />
              </div>
              {errors.amount && <small>{errors.amount.message}</small>}
            </label>
            <label>
              <span>Data</span>
              <input
                type="date"
                {...register("date", { required: "Informe a data." })}
              />
              {errors.date && <small>{errors.date.message}</small>}
            </label>
          </div>
          {type === "EXPENSE" && (
            <div className={styles.formGrid}>
              <label>
                <span>Categoria</span>
                <select {...register("category")}>
                  {categories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Área</span>
                <select {...register("areaId")}>
                  <option value="">Geral — toda a fazenda</option>
                  {defaults.areaId === "__keep__" && (
                    <option value="__keep__">Manter rateio atual</option>
                  )}
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
                {errors.areaId && <small>{errors.areaId.message}</small>}
              </label>
            </div>
          )}
          {save.isError && save.error.message !== "allocation-required" && (
            <p className={styles.error}>
              Não foi possível salvar o lançamento. Revise os dados.
            </p>
          )}
          <footer>
            <button type="button" onClick={onClose}>
              Cancelar
            </button>
            <button
              className={styles.primary}
              type="submit"
              disabled={save.isPending}
            >
              {save.isPending ? "Salvando…" : "Salvar lançamento"}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
