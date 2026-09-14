import type { AxiosResponse } from "axios";
import { client } from "../client";
import type { AttentionExplanation, AttentionItem } from "./responses";

export const attentionEndpoints = {
  items: (signal?: AbortSignal): Promise<AxiosResponse<AttentionItem[]>> =>
    client.get("/attention-items", { signal }),
  explanation: (
    id: string,
    signal?: AbortSignal,
  ): Promise<AxiosResponse<AttentionExplanation>> =>
    client.get(`/attention-items/${id}/explanation`, { signal }),
};
