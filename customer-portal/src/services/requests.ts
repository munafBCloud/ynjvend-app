import { apiRequest } from "./api";

import type {
  ProductRequest,
  RequestsResponse,
  RequestStatus,
} from "../types/request";

export async function getRequests(): Promise<ProductRequest[]> {
  const data = await apiRequest<RequestsResponse>("/requests");

  if (Array.isArray(data.requests)) {
    return data.requests;
  }

  return [];
}

export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus
): Promise<void> {
  await apiRequest("/requests", {
    method: "PUT",
    body: JSON.stringify({
      requestId,
      status,
    }),
  });
}
