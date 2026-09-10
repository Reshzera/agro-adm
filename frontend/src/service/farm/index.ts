import { client } from "../client";
import type { AxiosResponse } from "axios";
import type { Farm } from "./responses";
import type { UpdateFarmPayload } from "./payloads";

export const farmEndpoints = {
  current: (signal?: AbortSignal): Promise<AxiosResponse<Farm>> =>
    client.get<Farm>("/farms", { signal }),
  find: (farmId: string, signal?: AbortSignal): Promise<AxiosResponse<Farm>> =>
    client.get<Farm>(`/farms/${farmId}`, { signal }),
  update: (payload: UpdateFarmPayload): Promise<AxiosResponse<Farm>> =>
    client.patch<Farm>("/farms", payload),
};
