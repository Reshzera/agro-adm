import { cattleCategoryLabel } from "../format";
import styles from "../movement-confirmation/movement-confirmation.module.scss";
import type { ToolPart } from "../types";

type LotConfirmationProps = {
  part: ToolPart;
  onResolve(id: string, approved: boolean): void;
};

type LotInput = {
  name?: string;
  category?: string;
  headCount?: number;
  purpose?: string | null;
};

export function LotConfirmation({ part, onResolve }: LotConfirmationProps) {
  const input = (part.input ?? {}) as LotInput;

  if (part.state === "output-denied")
    return <p className={styles.fallback}>Cadastro cancelado. Nenhum lote foi criado.</p>;
  if (part.state === "output-available")
    return (
      <p className={styles.fallback}>
        Lote {input.name ?? ""} cadastrado. Ele ainda não está em nenhum pasto.
      </p>
    );
  if (part.state !== "approval-requested" || !part.approval)
    return <p className={styles.fallback}>Preparando o cadastro do lote…</p>;

  return (
    <aside className={styles.confirmation} aria-live="polite">
      <p className={styles.kicker}>Cadastro de lote</p>
      <h3>Criar o lote {input.name ?? "sem nome"}?</h3>
      <dl className={styles.facts}>
        <div>
          <dt>Categoria</dt>
          <dd>{cattleCategoryLabel(input.category ?? "")}</dd>
        </div>
        <div>
          <dt>Cabeças</dt>
          <dd>{input.headCount ?? 0}</dd>
        </div>
        {input.purpose && (
          <div>
            <dt>Finalidade</dt>
            <dd>{input.purpose}</dd>
          </div>
        )}
      </dl>
      <p>O lote nasce sem pasto: a primeira colocação é feita na tela de rebanho.</p>
      <div className={styles.actions}>
        <button
          className={styles.primaryButton}
          type="button"
          onClick={() => onResolve(part.approval!.id, true)}
        >
          Criar lote
        </button>
        <button
          className={styles.button}
          type="button"
          onClick={() => onResolve(part.approval!.id, false)}
        >
          Cancelar
        </button>
      </div>
    </aside>
  );
}
