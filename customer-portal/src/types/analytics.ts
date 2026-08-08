import type { InvoiceStatus } from "./invoice";
import type { OrderStatus } from "./order";

export type AnalyticsMetric = {
  label: string;
  value: number;
};

export type OrderStatusCount = {
  status: OrderStatus;
  count: number;
};

export type InvoiceStatusCount = {
  status: InvoiceStatus;
  count: number;
};

export type TopProductAnalytics = {
  productId: string;
  productName: string;
  quantityOrdered: number;
  invoicedQuantity: number;
  invoicedRevenue: number;
};

export type TopCustomerAnalytics = {
  customerId: string;
  businessName: string;
  invoiceCount: number;
  invoicedRevenue: number;
  amountCollected: number;
  outstandingBalance: number;
};

export type InventoryAnalyticsItem = {
  productId: string;
  productName: string;
  brand: string;
  quantityInStock: number;
  costValue: number;
  retailValue: number;
  potentialMargin: number;
  isLowStock: boolean;
};

export type AnalyticsSummary = {
  customerCount: number;
  orderCount: number;
  completedOrderCount: number;
  invoiceCount: number;

  totalInvoicedRevenue: number;
  collectedRevenue: number;
  outstandingBalance: number;

  inventoryCostValue: number;
  inventoryRetailValue: number;
  potentialInventoryMargin: number;

  lowStockProductCount: number;
};

export type AnalyticsData = {
  summary: AnalyticsSummary;
  orderStatusCounts: OrderStatusCount[];
  invoiceStatusCounts: InvoiceStatusCount[];
  topProducts: TopProductAnalytics[];
  topCustomers: TopCustomerAnalytics[];
  inventoryItems: InventoryAnalyticsItem[];
};
