import { client } from "../client";
import type { AxiosResponse } from "axios";
import type { UpdateProfilePayload } from "./payloads";
import type { Profile } from "./responses";

export const profileEndpoints = {
  current: (): Promise<AxiosResponse<Profile>> =>
    client.get<Profile>("/profile"),
  update: (payload: UpdateProfilePayload): Promise<AxiosResponse<Profile>> =>
    client.patch<Profile>("/profile", payload),
};
