export type ReceivingSessionStatus =
  | "OPEN"
  | "COMPLETED";

export type ReceivingSession = {
  companyId?: string;
  sessionId: string;
  status: ReceivingSessionStatus;
  startedAt: string;
  startedBy?: string;
  completedAt?: string;
  completedBy?: string;
  reference?: string;
  notes?: string;
  receiptCount: number;
  totalUnitsReceived: number;
  updatedAt?: string;
};

export type CreateReceivingSessionInput = {
  reference?: string;
  notes?: string;
};

export type CreateReceivingSessionResponse = {
  message?: string;
  session: ReceivingSession;
};

export type ReceiveInventoryInput = {
  sessionId: string;
  barcode: string;
  quantityReceived: number;
};

export type ReceivingInventoryItem = {
  companyId?: string;
  productId: string;
  productName: string;
  brand?: string;
  barcode?: string;
  barcodeType?: string;
  quantityInStock: number;
};

export type InventoryReceipt = {
  companyId?: string;
  receiptId: string;
  sessionId?: string;
  productId: string;
  barcode: string;
  quantityReceived: number;
  previousQuantity: number;
  newQuantity: number;
  receivedAt?: string;
  receivedBy?: string;
  type?: string;
};

export type LookupInventoryByBarcodeResponse = {
  item: ReceivingInventoryItem;
};

export type ReceiveInventoryResponse = {
  message?: string;
  item: ReceivingInventoryItem;
  receipt: InventoryReceipt;
};

export type CompleteReceivingSessionResponse = {
  message?: string;
  session: ReceivingSession;
};
