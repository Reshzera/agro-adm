import { client } from "../client";
import type { AxiosResponse } from "axios";
import type { AuthSession } from "./responses";

export const authEndpoints = {
  session: (): Promise<AxiosResponse<AuthSession | null>> =>
    client.get<AuthSession | null>("/api/auth/get-session"),
};
