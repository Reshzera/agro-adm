import styles from "./confirmation-card.module.scss";
import type { ToolPart } from "../types";

type ConfirmationCardProps = {
  part: ToolPart;
  onResolve(id: string, approved: boolean): void;
};

export function ConfirmationCard({ part, onResolve }: ConfirmationCardProps) {
  if (part.state === "approval-requested" && part.approval)
    return (
      <aside className={styles.confirmation} aria-live="polite">
        <p className={styles.kicker}>Ação sensível</p>
        <h3>Confirmar exclusão</h3>
        <p>Confira a despesa indicada na conversa antes de continuar.</p>
        <div className={styles.actions}>
          <button
            className={styles.dangerButton}
            type="button"
            onClick={() => onResolve(part.approval!.id, true)}
          >
            Excluir despesa
          </button>
          <button
            className={styles.button}
            type="button"
            onClick={() => onResolve(part.approval!.id, false)}
          >
            Manter despesa
          </button>
        </div>
      </aside>
    );

  if (part.state === "output-denied")
    return (
      <p className={styles.fallback}>
        Exclusão cancelada. A despesa foi mantida.
      </p>
    );
  if (part.state === "output-available")
    return <p className={styles.fallback}>Despesa excluída.</p>;
  return (
    <p className={styles.fallback}>Aguardando a confirmação da exclusão…</p>
  );
}
