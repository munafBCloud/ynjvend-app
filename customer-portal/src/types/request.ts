export type RequestStatus =
  | "New"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export type ProductRequest = {
  requestId: string;
  customerId: string;
  businessName: string;
  productId: string;
  productName: string;
  quantityRequested: number;
  status: RequestStatus;
  requestedAt: string;
};

export type RequestsResponse = {
  requests: ProductRequest[];
  count?: number;
};

export type UpdateRequestResponse = {
  message: string;
  request: ProductRequest;
};
