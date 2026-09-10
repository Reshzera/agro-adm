import type { AxiosResponse } from "axios";
import { client } from "../client";
import type { FinancialEntryPayload, FinancialFilters } from "./payloads";
import type {
  FarmAreaOption,
  FinancialEntry,
  FinancialSummary,
} from "./responses";

export const financialEndpoints = {
  entries: (
    filters: FinancialFilters,
    signal?: AbortSignal,
  ): Promise<AxiosResponse<FinancialEntry[]>> =>
    client.get("/financial/entries", { params: filters, signal }),
  summary: (
    filters: Pick<FinancialFilters, "from" | "to">,
    signal?: AbortSignal,
  ): Promise<AxiosResponse<FinancialSummary>> =>
    client.get("/financial/summary", { params: filters, signal }),
  areas: (signal?: AbortSignal): Promise<AxiosResponse<FarmAreaOption[]>> =>
    client.get("/financial/areas", { signal }),
  createExpense: (
    payload: FinancialEntryPayload,
  ): Promise<AxiosResponse<FinancialEntry>> =>
    client.post("/financial/expenses", payload),
  updateExpense: (
    id: string,
    payload: FinancialEntryPayload,
  ): Promise<AxiosResponse<FinancialEntry>> =>
    client.patch(`/financial/expenses/${id}`, { ...payload, id }),
  deleteExpense: (id: string): Promise<AxiosResponse<void>> =>
    client.delete(`/financial/expenses/${id}`),
  createRevenue: (
    payload: FinancialEntryPayload,
  ): Promise<AxiosResponse<FinancialEntry>> =>
    client.post("/financial/revenues", payload),
  updateRevenue: (
    id: string,
    payload: FinancialEntryPayload,
  ): Promise<AxiosResponse<FinancialEntry>> =>
    client.patch(`/financial/revenues/${id}`, { ...payload, id }),
  deleteRevenue: (id: string): Promise<AxiosResponse<void>> =>
    client.delete(`/financial/revenues/${id}`),
};
