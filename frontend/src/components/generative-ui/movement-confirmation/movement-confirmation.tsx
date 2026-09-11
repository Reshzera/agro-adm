import { useQuery } from "@tanstack/react-query";
import { cattleEndpoints } from "../../../service/cattle";
import type { CattleMovementIntent } from "../../../service/cattle/payloads";
import styles from "./movement-confirmation.module.scss";
import type { ToolPart } from "../types";

type MovementConfirmationProps = {
  part: ToolPart;
  onResolve(id: string, approved: boolean): void;
};

function intentOf(part: ToolPart): CattleMovementIntent | null {
  const input = part.input as Partial<CattleMovementIntent> | undefined;
  if (!input?.lotId || !input.fromPaddockId || !input.toPaddockId || !input.occurredAt)
    return null;
  return {
    lotId: input.lotId,
    fromPaddockId: input.fromPaddockId,
    toPaddockId: input.toPaddockId,
    occurredAt: input.occurredAt,
    reason: input.reason ?? null,
    notes: input.notes ?? null,
  };
}

function day(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function MovementConfirmation({ part, onResolve }: MovementConfirmationProps) {
  const intent = intentOf(part);
  const pending = part.state === "approval-requested" && Boolean(part.approval);
  const preview = useQuery({
    queryKey: ["cattle", "movement-preview", part.toolCallId],
    queryFn: async ({ signal }) =>
      (await cattleEndpoints.previewMovement(intent!, signal)).data,
    enabled: pending && intent !== null,
  });

  if (part.state === "output-denied")
    return (
      <p className={styles.fallback}>
        Movimento cancelado. Nada foi alterado no rebanho.
      </p>
    );

  if (part.state === "output-available") {
    const output = part.output as
      | { lot?: { name?: string }; toPaddock?: { name?: string } }
      | undefined;
    return (
      <p className={styles.fallback}>
        Movimento registrado: {output?.lot?.name ?? "lote"} agora está em{" "}
        {output?.toPaddock?.name ?? "outro pasto"}.
      </p>
    );
  }

  if (!pending)
    return <p className={styles.fallback}>Preparando a movimentação…</p>;

  if (preview.isPending)
    return <p className={styles.fallback}>Conferindo o que vai mudar…</p>;

  if (preview.isError || !preview.data)
    return (
      <aside className={styles.confirmation} aria-live="polite">
        <p className={styles.kicker}>Movimentação de rebanho</p>
        <h3>Não dá para fazer esse movimento</h3>
        <p>Confira o lote e o pasto de destino na tela de rebanho.</p>
        <div className={styles.actions}>
          <button
            className={styles.button}
            type="button"
            onClick={() => onResolve(part.approval!.id, false)}
          >
            Entendi, cancelar
          </button>
        </div>
      </aside>
    );

  const data = preview.data;
  const utilization = data.destination.utilizationPercent;

  return (
    <aside className={styles.confirmation} aria-live="polite">
      <p className={styles.kicker}>Movimentação de rebanho</p>
      <h3>
        Mover {data.headCount} cabeças do {data.lot.name}?
      </h3>
      <div className={styles.route}>
        <div>
          <span>Sai de</span>
          <strong>{data.fromPaddock.name}</strong>
        </div>
        <b aria-hidden="true">→</b>
        <div>
          <span>Entra em</span>
          <strong>{data.toPaddock.name}</strong>
        </div>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>Quando</dt>
          <dd>{day(data.occurredAt)}</dd>
        </div>
        <div>
          <dt>{data.toPaddock.name} depois</dt>
          <dd>
            {data.destination.headCountAfter ?? data.headCount} cabeças
            {utilization === null
              ? ""
              : ` · ${Math.round(utilization)}% da lotação`}
          </dd>
        </div>
      </dl>
      {data.warnings.length > 0 && (
        <ul className={styles.warnings}>
          {data.warnings.map((warning) => (
            <li key={warning.ruleId}>{warning.message}</li>
          ))}
        </ul>
      )}
      <div className={styles.actions}>
        <button
          className={styles.primaryButton}
          type="button"
          onClick={() => onResolve(part.approval!.id, true)}
        >
          Confirmar movimento
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
