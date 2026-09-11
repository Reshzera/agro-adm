import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { cattleEndpoints } from "../../service/cattle";
import type {
  CattleLotPayload,
  PaddockPayload,
} from "../../service/cattle/payloads";
import type {
  CattleCategory,
  CattleLot,
  Paddock,
  ResolvedSetting,
} from "../../service/cattle/responses";
import styles from "./cattle.page.module.scss";

const categoryLabels: Record<CattleCategory, string> = {
  CALVES: "Bezerros",
  HEIFERS: "Novilhas",
  COWS: "Vacas",
  BULLS: "Touros",
  STEERS: "Garrotes / bois",
  FINISHING: "Terminação",
};

type Editor =
  | { kind: "lot"; item?: CattleLot }
  | { kind: "paddock"; item?: Paddock }
  | { kind: "placement"; lot: CattleLot };

function localDate(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function sourceLabel(setting: ResolvedSetting<unknown>): string {
  if (setting.source === "PADDOCK") return "Definido neste pasto";
  if (setting.source === "FARM") return "Padrão da fazenda";
  return "Padrão do sistema";
}

function errorMessage(error: unknown): string {
  const candidate = error as { response?: { data?: { message?: string | string[] } } };
  const message = candidate.response?.data?.message;
  return Array.isArray(message)
    ? message.join(" ")
    : message ?? "Não foi possível salvar. Confira os dados e tente novamente.";
}

export function CattlePage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"lots" | "paddocks">("lots");
  const [editor, setEditor] = useState<Editor | null>(null);
  const lots = useQuery({
    queryKey: ["cattle", "lots"],
    queryFn: async ({ signal }) => (await cattleEndpoints.lots(signal)).data,
  });
  const paddocks = useQuery({
    queryKey: ["cattle", "paddocks"],
    queryFn: async ({ signal }) => (await cattleEndpoints.paddocks(signal)).data,
  });

  const totalHead = lots.data
    ?.filter((lot) => lot.active)
    .reduce((sum, lot) => sum + lot.headCount, 0);
  const occupied = paddocks.data?.filter(
    (paddock) => paddock.occupancies.length,
  ).length;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["cattle"] });
    setEditor(null);
  };

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>Manejo · visão do rebanho</p>
          <h1>
            Gado em movimento,
            <br />
            <em>pasto sob controle.</em>
          </h1>
        </div>
        <button
          className={styles.addButton}
          onClick={() => setEditor({ kind: view === "lots" ? "lot" : "paddock" })}
        >
          + {view === "lots" ? "Novo lote" : "Novo pasto"}
        </button>
      </header>

      <div className={styles.pulse}>
        <div><span>Cabeças ativas</span><strong>{totalHead ?? "—"}</strong></div>
        <div><span>Lotes em manejo</span><strong>{lots.data?.filter((lot) => lot.active).length ?? "—"}</strong></div>
        <div><span>Pastos ocupados</span><strong>{occupied ?? "—"}<small> / {paddocks.data?.length ?? "—"}</small></strong></div>
        <div className={styles.legend}><i /> ocupado <i /> disponível</div>
      </div>

      <nav className={styles.tabs} aria-label="Visão de manejo">
        <button data-active={view === "lots"} onClick={() => setView("lots")}>Lotes</button>
        <button data-active={view === "paddocks"} onClick={() => setView("paddocks")}>Pastos</button>
      </nav>

      {view === "lots" ? (
        <LotView
          lots={lots.data}
          pending={lots.isPending}
          error={lots.isError}
          onEdit={(item) => setEditor({ kind: "lot", item })}
          onPlace={(lot) => setEditor({ kind: "placement", lot })}
        />
      ) : (
        <PaddockView
          paddocks={paddocks.data}
          pending={paddocks.isPending}
          error={paddocks.isError}
          onEdit={(item) => setEditor({ kind: "paddock", item })}
        />
      )}

      {editor?.kind === "lot" && (
        <LotEditor editor={editor} close={() => setEditor(null)} saved={refresh} />
      )}
      {editor?.kind === "paddock" && (
        <PaddockEditor editor={editor} close={() => setEditor(null)} saved={refresh} />
      )}
      {editor?.kind === "placement" && (
        <PlacementEditor
          lot={editor.lot}
          paddocks={paddocks.data ?? []}
          close={() => setEditor(null)}
          saved={refresh}
        />
      )}
    </section>
  );
}

function LotView({ lots, pending, error, onEdit, onPlace }: {
  lots?: CattleLot[];
  pending: boolean;
  error: boolean;
  onEdit(item: CattleLot): void;
  onPlace(item: CattleLot): void;
}) {
  if (pending) return <p className={styles.status}>Reunindo os lotes…</p>;
  if (error) return <p className={styles.error}>Não foi possível carregar os lotes.</p>;
  if (!lots?.length) return <Empty text="Nenhum lote cadastrado ainda." />;
  return <div className={styles.lotList}>
    {lots.map((lot, index) => <article key={lot.id} data-inactive={!lot.active}>
      <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
      <div className={styles.lotIdentity}>
        <span>{categoryLabels[lot.category]}</span>
        <h2>{lot.name}</h2>
        <p>{lot.purpose || "Sem finalidade informada"}</p>
      </div>
      <div className={styles.headCount}><strong>{lot.headCount}</strong><span>cabeças</span></div>
      <div className={styles.location} data-empty={!lot.currentOccupancy}>
        <span>{lot.currentOccupancy ? "Agora em" : "Localização"}</span>
        <strong>{lot.currentOccupancy?.paddock.name ?? "Sem pasto"}</strong>
        {lot.currentOccupancy && <small>desde {new Date(lot.currentOccupancy.startedAt).toLocaleDateString("pt-BR")}</small>}
      </div>
      <div className={styles.rowActions}>
        {!lot.currentOccupancy && lot.active && <button onClick={() => onPlace(lot)}>Colocar no pasto</button>}
        <button onClick={() => onEdit(lot)}>Editar</button>
      </div>
    </article>)}
  </div>;
}

function PaddockView({ paddocks, pending, error, onEdit }: {
  paddocks?: Paddock[];
  pending: boolean;
  error: boolean;
  onEdit(item: Paddock): void;
}) {
  if (pending) return <p className={styles.status}>Percorrendo os pastos…</p>;
  if (error) return <p className={styles.error}>Não foi possível carregar os pastos.</p>;
  if (!paddocks?.length) return <Empty text="Nenhum pasto cadastrado ainda." />;
  return <div className={styles.paddockGrid}>
    {paddocks.map((paddock) => {
      const heads = paddock.occupancies.reduce((sum, item) => sum + item.lot.headCount, 0);
      return <article key={paddock.id} data-occupied={paddock.occupancies.length > 0} data-inactive={!paddock.active}>
        <header><span>{paddock.occupancies.length ? "Em pastejo" : "Disponível"}</span><button onClick={() => onEdit(paddock)}>Editar</button></header>
        <h2>{paddock.name}</h2>
        <p className={styles.forage}>{paddock.forageType || "Forrageira não informada"}</p>
        <div className={styles.occupancyMark}>
          <strong>{heads || "—"}</strong><span>{heads ? "cabeças agora" : "sem lote agora"}</span>
          {paddock.occupancies.map(({ lot }) => <small key={lot.id}>{lot.name}</small>)}
        </div>
        <dl>
          <div><dt>Área útil</dt><dd>{paddock.usableAreaHa ? `${paddock.usableAreaHa} ha` : "Não informada"}</dd></div>
          <Setting label="Pastejo máximo" setting={paddock.effectiveSettings.maxGrazingDays} suffix=" dias" />
          <Setting label="Descanso mínimo" setting={paddock.effectiveSettings.minRestDays} suffix=" dias" />
          <div><dt>Capacidade planejada</dt><dd>{paddock.plannedCapacityHead ?? "Não informada"}</dd></div>
        </dl>
      </article>;
    })}
  </div>;
}

function Setting({ label, setting, suffix }: { label: string; setting: ResolvedSetting<number>; suffix: string }) {
  return <div><dt>{label}</dt><dd>{setting.value === null ? "Não configurado" : `${setting.value}${suffix}`}<small>{sourceLabel(setting)}</small></dd></div>;
}

function Empty({ text }: { text: string }) {
  return <div className={styles.empty}><b>∅</b><p>{text}</p></div>;
}

function LotEditor({ editor, close, saved }: { editor: Extract<Editor, { kind: "lot" }>; close(): void; saved(): void }) {
  const item = editor.item;
  const form = useForm<CattleLotPayload>({ defaultValues: {
    name: item?.name ?? "", category: item?.category ?? "STEERS", headCount: item?.headCount ?? 0,
    purpose: item?.purpose ?? "", startedOn: item?.startedOn?.slice(0, 10) ?? "", notes: item?.notes ?? "", active: item?.active ?? true,
  }});
  const mutation = useMutation({ mutationFn: (payload: CattleLotPayload) => item ? cattleEndpoints.updateLot(item.id, payload) : cattleEndpoints.createLot(payload), onSuccess: saved });
  return <EditorShell title={item ? "Editar lote" : "Novo lote"} eyebrow="Rebanho" close={close}>
    <form onSubmit={form.handleSubmit((values) => mutation.mutate({ ...values, headCount: Number(values.headCount), purpose: values.purpose || null, startedOn: values.startedOn || null, notes: values.notes || null }))}>
      <label><span>Nome do lote</span><input {...form.register("name", { required: true })} placeholder="Ex.: Lote 14" /></label>
      <div className={styles.formGrid}>
        <label><span>Categoria</span><select {...form.register("category")}>{Object.entries(categoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label><span>Número de cabeças</span><input type="number" min="0" {...form.register("headCount", { valueAsNumber: true, min: 0 })} /></label>
      </div>
      <label><span>Finalidade</span><input {...form.register("purpose")} placeholder="Ex.: Recria" /></label>
      <label><span>Data de formação</span><input type="date" {...form.register("startedOn")} /></label>
      <label><span>Observações</span><textarea {...form.register("notes")} rows={3} /></label>
      {item && <label className={styles.check}><input type="checkbox" {...form.register("active")} /><span>Lote ativo</span></label>}
      {mutation.isError && <p className={styles.formError}>{errorMessage(mutation.error)}</p>}
      <footer><button type="button" onClick={close}>Cancelar</button><button className={styles.primary} disabled={mutation.isPending}>Salvar lote</button></footer>
    </form>
  </EditorShell>;
}

function PaddockEditor({ editor, close, saved }: { editor: Extract<Editor, { kind: "paddock" }>; close(): void; saved(): void }) {
  const item = editor.item;
  type Form = { name: string; hectares: string; usableAreaHa: string; maxGrazingDays: string; minRestDays: string; plannedCapacityHead: string; forageType: string; active: boolean };
  const form = useForm<Form>({ defaultValues: {
    name: item?.name ?? "", hectares: item?.hectares ?? "", usableAreaHa: item?.usableAreaHa ?? "",
    maxGrazingDays: item?.maxGrazingDays?.toString() ?? "", minRestDays: item?.minRestDays?.toString() ?? "",
    plannedCapacityHead: item?.plannedCapacityHead?.toString() ?? "", forageType: item?.forageType ?? "", active: item?.active ?? true,
  }});
  const mutation = useMutation({ mutationFn: (payload: PaddockPayload) => item ? cattleEndpoints.updatePaddock(item.id, payload) : cattleEndpoints.createPaddock(payload), onSuccess: saved });
  const optionalNumber = (value: string) => value === "" ? null : Number(value);
  return <EditorShell title={item ? "Editar pasto" : "Novo pasto"} eyebrow="Manejo de área" close={close}>
    <form onSubmit={form.handleSubmit((values) => mutation.mutate({
      name: values.name, hectares: values.hectares || null, usableAreaHa: values.usableAreaHa || null,
      maxGrazingDays: optionalNumber(values.maxGrazingDays), minRestDays: optionalNumber(values.minRestDays),
      plannedCapacityHead: optionalNumber(values.plannedCapacityHead), forageType: values.forageType || null, active: values.active,
    }))}>
      <label><span>Nome do pasto</span><input {...form.register("name", { required: true })} placeholder="Ex.: Pasto 7" /></label>
      <label><span>Forrageira</span><input {...form.register("forageType")} placeholder="Ex.: Mombaça" /></label>
      <div className={styles.formGrid}>
        <label><span>Área total (ha)</span><input inputMode="decimal" {...form.register("hectares")} /></label>
        <label><span>Área útil (ha)</span><input inputMode="decimal" {...form.register("usableAreaHa")} /></label>
      </div>
      <p className={styles.formHint}>Deixe os limites vazios para usar automaticamente o padrão da fazenda.</p>
      <div className={styles.formGrid}>
        <label><span>Máx. pastejo (dias)</span><input type="number" min="1" {...form.register("maxGrazingDays")} placeholder={item?.effectiveSettings.maxGrazingDays.value?.toString() ?? "Padrão"} /></label>
        <label><span>Mín. descanso (dias)</span><input type="number" min="1" {...form.register("minRestDays")} placeholder={item?.effectiveSettings.minRestDays.value?.toString() ?? "Padrão"} /></label>
      </div>
      <label><span>Capacidade planejada (cabeças)</span><input type="number" min="0" {...form.register("plannedCapacityHead")} /></label>
      {item && <label className={styles.check}><input type="checkbox" {...form.register("active")} /><span>Pasto ativo</span></label>}
      {mutation.isError && <p className={styles.formError}>{errorMessage(mutation.error)}</p>}
      <footer><button type="button" onClick={close}>Cancelar</button><button className={styles.primary} disabled={mutation.isPending}>Salvar pasto</button></footer>
    </form>
  </EditorShell>;
}

function PlacementEditor({ lot, paddocks, close, saved }: { lot: CattleLot; paddocks: Paddock[]; close(): void; saved(): void }) {
  const available = paddocks.filter((paddock) => paddock.active);
  const form = useForm<{ paddockId: string; startedAt: string }>({ defaultValues: { paddockId: available[0]?.id ?? "", startedAt: localDate() } });
  const mutation = useMutation({ mutationFn: ({ paddockId, startedAt }: { paddockId: string; startedAt: string }) => cattleEndpoints.placeLot(lot.id, paddockId, `${startedAt}T12:00:00.000Z`), onSuccess: saved });
  return <EditorShell title={`Colocar ${lot.name}`} eyebrow="Primeira ocupação" close={close}>
    <p className={styles.editorIntro}>{lot.headCount} cabeças serão vinculadas ao pasto escolhido. Os próximos deslocamentos entrarão no histórico de movimentação.</p>
    <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <label><span>Pasto de destino</span><select {...form.register("paddockId", { required: true })}>{available.map((paddock) => <option key={paddock.id} value={paddock.id}>{paddock.name}{paddock.occupancies.length ? " · ocupado" : " · disponível"}</option>)}</select></label>
      <label><span>Data de entrada</span><input type="date" {...form.register("startedAt", { required: true })} /></label>
      {!available.length && <p className={styles.formError}>Cadastre ou ative um pasto antes de colocar este lote.</p>}
      {mutation.isError && <p className={styles.formError}>{errorMessage(mutation.error)}</p>}
      <footer><button type="button" onClick={close}>Cancelar</button><button className={styles.primary} disabled={!available.length || mutation.isPending}>Confirmar entrada</button></footer>
    </form>
  </EditorShell>;
}

function EditorShell({ title, eyebrow, close, children }: { title: string; eyebrow: string; close(): void; children: React.ReactNode }) {
  return <div className={styles.overlay} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><aside className={styles.editor} role="dialog" aria-modal="true" aria-label={title}><header><div><p className={styles.kicker}>{eyebrow}</p><h2>{title}</h2></div><button className={styles.close} onClick={close} aria-label="Fechar">×</button></header>{children}</aside></div>;
}
