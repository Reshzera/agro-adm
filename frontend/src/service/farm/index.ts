import { client } from "../client";
import type { AxiosResponse } from "axios";
import type { Farm } from "./responses";

export const farmEndpoints = {
  find: (farmId: string): Promise<AxiosResponse<Farm>> =>
    client.get<Farm>(`/farms/${farmId}`),
};
