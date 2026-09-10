import type { AxiosResponse } from "axios";
import type { UIMessage } from "ai";
import { client } from "../client";
import type { PostChatPayload } from "./payloads";
import type { ChatHistory, ChatSummary, CreatedChat } from "./responses";

export const chatEndpoints = {
  list: (signal?: AbortSignal): Promise<AxiosResponse<ChatSummary[]>> =>
    client.get<ChatSummary[]>("/chats", { signal }),
  create: (): Promise<AxiosResponse<CreatedChat>> =>
    client.post<CreatedChat>("/chats/new"),
  rename: (chatId: string, title: string): Promise<AxiosResponse<void>> =>
    client.patch<void>(`/chats/${chatId}`, { title }),
  archive: (chatId: string): Promise<AxiosResponse<void>> =>
    client.delete<void>(`/chats/${chatId}`),
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
