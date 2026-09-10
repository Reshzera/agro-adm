import type { AxiosResponse } from "axios";
import type { UIMessage } from "ai";
import { client } from "../client";
import type { PostChatPayload } from "./payloads";
import type { ChatHistory } from "./responses";

export const chatEndpoints = {
  history: (
    chatId: string,
    signal?: AbortSignal,
  ): Promise<AxiosResponse<ChatHistory>> =>
    client.get<ChatHistory>(`/chats/${chatId}`, { signal }),
  streamUrl: (): string => `${client.defaults.baseURL}/chats`,
  payload: (id: string, message: UIMessage): PostChatPayload => ({
    id,
    message,
  }),
};
