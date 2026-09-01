import { apiRequest } from "./api";

import type {
  CompleteReceivingSessionResponse,
  CreateReceivingSessionInput,
  CreateReceivingSessionResponse,
  LookupInventoryByBarcodeResponse,
  ReceiveInventoryInput,
  ReceiveInventoryResponse,
} from "../types/receiving";

export async function createReceivingSession(
  input: CreateReceivingSessionInput = {},
): Promise<CreateReceivingSessionResponse> {
  return apiRequest<CreateReceivingSessionResponse>(
    "/inventory/receiving-sessions",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function lookupInventoryByBarcode(
  barcode: string,
): Promise<LookupInventoryByBarcodeResponse> {
  return apiRequest<LookupInventoryByBarcodeResponse>(
    `/inventory/barcode/${encodeURIComponent(barcode)}`,
  );
}

export async function receiveInventory(
  input: ReceiveInventoryInput,
  idempotencyKey: string,
): Promise<ReceiveInventoryResponse> {
  return apiRequest<ReceiveInventoryResponse>(
    "/inventory/receive",
    {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(input),
    },
  );
}

export async function completeReceivingSession(
  sessionId: string,
): Promise<CompleteReceivingSessionResponse> {
  return apiRequest<CompleteReceivingSessionResponse>(
    `/inventory/receiving-sessions/${encodeURIComponent(
      sessionId,
    )}/complete`,
    {
      method: "POST",
    },
  );
}
