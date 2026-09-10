import { client } from "../client";
import type { AxiosResponse } from "axios";
import type { AuthSession, SignInWithEmailPayload, SignUpWithEmailPayload } from "./responses";

export const authEndpoints = {
  session: (): Promise<AxiosResponse<AuthSession | null>> =>
    client.get<AuthSession | null>("/api/auth/get-session"),
  signInWithEmail: (payload: SignInWithEmailPayload): Promise<AxiosResponse<AuthSession>> =>
    client.post<AuthSession>("/api/auth/sign-in/email", payload),
  signUpWithEmail: (payload: SignUpWithEmailPayload): Promise<AxiosResponse> =>
    client.post("/api/auth/sign-up/email", payload),
};
