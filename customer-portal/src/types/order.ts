export type OrderStatus =
  | "New"
  | "Preparing"
  | "Completed"
  | "Cancelled";

export type PaymentStatus =
  | "Unpaid"
  | "Partially Paid"
  | "Paid";

export type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Order = {
  orderId: string;
  customerId: string;
  businessName: string;
  status: OrderStatus;
  notes: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrderItem = {
  productId: string;
  quantity: number;
};

export type CreateOrderInput = {
  customerId: string;
  notes: string;
  items: CreateOrderItem[];
};

export type OrdersResponse = {
  orders: Order[];
  count: number;
};

export type CreateOrderResponse = {
  message: string;
  order: Order;
};

export type UpdateOrderResponse = {
  message: string;
  order: Order;
};
