import { apiRequest } from "./api";

import type {
  CreateOrderInput,
  CreateOrderResponse,
  Order,
  OrdersResponse,
  OrderStatus,
  UpdateOrderResponse,
} from "../types/order";

export async function getOrders(): Promise<Order[]> {
  const data = await apiRequest<OrdersResponse>("/orders");

  if (Array.isArray(data.orders)) {
    return data.orders;
  }

  return [];
}

export async function createOrder(
  orderInput: CreateOrderInput,
): Promise<Order> {
  const data = await apiRequest<CreateOrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify(orderInput),
  });

  return data.order;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<Order> {
  const data = await apiRequest<UpdateOrderResponse>(
    `/orders/${encodeURIComponent(orderId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        status,
      }),
    },
  );

  return data.order;
}
