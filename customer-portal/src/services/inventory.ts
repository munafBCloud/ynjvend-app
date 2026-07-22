import { apiRequest } from "./api";
import type {
  InventoryItem,
  InventoryResponse,
} from "../types/inventory";

export async function getInventory(): Promise<InventoryItem[]> {
  const data = await apiRequest<InventoryResponse>("/inventory");

  return Array.isArray(data.items) ? data.items : [];
}
