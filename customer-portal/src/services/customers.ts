import { apiRequest } from "./api";
import type {
  Customer,
  CustomersResponse,
} from "../types/customer";

export async function getCustomers(): Promise<Customer[]> {
  const data = await apiRequest<CustomersResponse>("/customers");

  if (Array.isArray(data.items)) {
    return data.items;
  }

  if (Array.isArray(data.customers)) {
    return data.customers;
  }

  return [];
}
