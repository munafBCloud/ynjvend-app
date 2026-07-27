import { apiRequest } from "./api";

import type {
  CreateInventoryInput,
  CreateInventoryResponse,
  InventoryItem,
  InventoryResponse,
} from "../types/inventory";

export async function getInventory(): Promise<InventoryItem[]> {
  const data = await apiRequest<InventoryResponse>("/inventory");

  return Array.isArray(data.items) ? data.items : [];
}

export async function createInventory(
  input: CreateInventoryInput
): Promise<CreateInventoryResponse> {
  return apiRequest<CreateInventoryResponse>("/inventory", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
