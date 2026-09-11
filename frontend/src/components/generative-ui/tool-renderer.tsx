import { ConfirmationCard } from "./confirmation-card/confirmation-card";
import { ExpenseChart } from "./expense-chart/expense-chart";
import { ExpenseTable } from "./expense-table/expense-table";
import { FinancialSummary } from "./financial-summary/financial-summary";
import { LotConfirmation } from "./lot-confirmation/lot-confirmation";
import { ManualForm } from "./manual-form/manual-form";
import { MovementConfirmation } from "./movement-confirmation/movement-confirmation";
import { RevenueChart } from "./revenue-chart/revenue-chart";
import styles from "./tool-renderer.module.scss";
import type {
  Expense,
  FinancialSummaryOutput,
  Revenue,
  ToolActions,
  ToolPart,
} from "./types";

function availableOutput(part: ToolPart): unknown | null {
  return part.state === "output-available" ? part.output : null;
}

export function ToolRenderer({
  part,
  actions,
}: {
  part: ToolPart;
  actions: ToolActions;
}) {
  const output = availableOutput(part);

  switch (part.type) {
    case "tool-getFinancialSummary": {
      if (!output)
        return (
          <p className={styles.fallback}>Calculando o resumo financeiro…</p>
        );
      const summary = output as FinancialSummaryOutput;
      return (
        <>
          <FinancialSummary output={summary} />
          <ExpenseChart items={summary.expensesByCategory ?? []} />
        </>
      );
    }
    case "tool-getExpenses":
      return Array.isArray(output) ? (
        <ExpenseTable expenses={output as Expense[]} />
      ) : (
        <p className={styles.fallback}>Buscando despesas…</p>
      );
    case "tool-getRevenue":
      return Array.isArray(output) ? (
        <RevenueChart revenues={output as Revenue[]} />
      ) : (
        <p className={styles.fallback}>Buscando receitas…</p>
      );
    case "tool-deleteExpense":
      return <ConfirmationCard part={part} onResolve={actions.approve} />;
    case "tool-moveCattleLot":
      return <MovementConfirmation part={part} onResolve={actions.approve} />;
    case "tool-createCattleLot":
      return <LotConfirmation part={part} onResolve={actions.approve} />;
    case "tool-getCattleOverview":
      return null;
    case "tool-showManualForm":
      return (
        <ManualForm
          part={part}
          onSubmit={(form) => actions.submitToolOutput(part.toolCallId, form)}
        />
      );
    default:
      if (part.state === "output-error")
        return (
          <p className={styles.fallback}>
            Não foi possível concluir esta ação.
          </p>
        );
      return (
        <p className={styles.fallback}>
          Resultado da ação disponível na resposta do assistente.
        </p>
      );
  }
}
