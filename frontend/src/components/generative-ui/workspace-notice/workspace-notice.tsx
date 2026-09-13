import {
  datasetForEntity,
  groupingLabels,
  parseWorkspaceCommand,
} from "../../../workspace/workspace.commands";
import { workspaceDatasetDefinitions } from "../../workspace/workspace.datasets";
import styles from "./workspace-notice.module.scss";
import type { ToolPart } from "../types";

function label(part: ToolPart): string {
  const tool = part.type.replace("tool-", "");
  const parsed = parseWorkspaceCommand(tool, part.input);
  if (!parsed.ok)
    return `Não consegui montar essa visão no painel. ${parsed.error}`;
  const view = parsed.view;
  if (view.kind === "entity")
    return `Abri a ficha no painel — ${workspaceDatasetDefinitions[datasetForEntity(view.entityType)].singular}.`;
  if (view.kind === "chart")
    return `Desenhei no painel: ${view.title ?? `${workspaceDatasetDefinitions[view.dataset].label} por ${groupingLabels[view.groupBy]}`}.`;
  return `Abri no painel: ${view.title ?? workspaceDatasetDefinitions[view.dataset].label}.`;
}

export function WorkspaceNotice({ part }: { part: ToolPart }) {
  return <p className={styles.notice}>{label(part)}</p>;
}
