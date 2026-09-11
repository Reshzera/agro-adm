import type { AxiosResponse } from "axios";
import { client } from "../client";
import type {
  CattleLotPayload,
  CattleMovementIntent,
  CattleMovementPayload,
  PaddockPayload,
} from "./payloads";
import type {
  CattleLot,
  CattleMovementResult,
  MovementPreview,
  Paddock,
} from "./responses";

export const cattleEndpoints = {
  lots: (signal?: AbortSignal): Promise<AxiosResponse<CattleLot[]>> =>
    client.get("/cattle/lots", { signal }),
  createLot: (payload: CattleLotPayload): Promise<AxiosResponse<CattleLot>> =>
    client.post("/cattle/lots", payload),
  updateLot: (
    id: string,
    payload: Partial<CattleLotPayload>,
  ): Promise<AxiosResponse<CattleLot>> =>
    client.patch(`/cattle/lots/${id}`, payload),
  paddocks: (signal?: AbortSignal): Promise<AxiosResponse<Paddock[]>> =>
    client.get("/cattle/paddocks", { signal }),
  createPaddock: (
    payload: PaddockPayload,
  ): Promise<AxiosResponse<Paddock>> =>
    client.post("/cattle/paddocks", payload),
  updatePaddock: (
    id: string,
    payload: Partial<PaddockPayload>,
  ): Promise<AxiosResponse<Paddock>> =>
    client.patch(`/cattle/paddocks/${id}`, payload),
  placeLot: (lotId: string, paddockId: string, startedAt: string) =>
    client.post(`/cattle/lots/${lotId}/initial-placement`, {
      paddockId,
      startedAt,
    }),
  moveLot: (
    payload: CattleMovementPayload,
  ): Promise<AxiosResponse<CattleMovementResult>> =>
    client.post("/cattle/movements", payload),
  previewMovement: (
    payload: CattleMovementIntent,
    signal?: AbortSignal,
  ): Promise<AxiosResponse<MovementPreview>> =>
    client.post("/cattle/movements/preview", payload, { signal }),
};
