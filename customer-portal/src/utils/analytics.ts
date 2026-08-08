import type {
  AnalyticsData,
  AnalyticsSummary,
  InventoryAnalyticsItem,
  InvoiceStatusCount,
  OrderStatusCount,
  TopCustomerAnalytics,
  TopProductAnalytics,
} from "../types/analytics";

import type { Customer } from "../types/customer";
import type {
  Invoice,
  InvoiceStatus,
} from "../types/invoice";
import type { InventoryItem } from "../types/inventory";
import type {
  Order,
  OrderStatus,
} from "../types/order";

const ORDER_STATUSES: OrderStatus[] = [
  "New",
  "Preparing",
  "Completed",
  "Cancelled",
];

const INVOICE_STATUSES: InvoiceStatus[] = [
  "Draft",
  "Sent",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Void",
];

function toSafeNumber(
  value: number | string | null | undefined,
): number {
  const numericValue = Number(value ?? 0);

  if (
    !Number.isFinite(numericValue) ||
    numericValue < 0
  ) {
    return 0;
  }

  return numericValue;
}

function roundCurrency(value: number): number {
  return Math.round(
    (value + Number.EPSILON) * 100,
  ) / 100;
}

function buildOrderStatusCounts(
  orders: Order[],
): OrderStatusCount[] {
  return ORDER_STATUSES.map((status) => ({
    status,
    count: orders.filter(
      (order) => order.status === status,
    ).length,
  }));
}

function buildInvoiceStatusCounts(
  invoices: Invoice[],
): InvoiceStatusCount[] {
  return INVOICE_STATUSES.map((status) => ({
    status,
    count: invoices.filter(
      (invoice) => invoice.status === status,
    ).length,
  }));
}

function buildInventoryAnalytics(
  inventory: InventoryItem[],
): InventoryAnalyticsItem[] {
  return inventory
    .map((item) => {
      const quantityInStock = toSafeNumber(
        item.quantityInStock,
      );

      const caseCost = toSafeNumber(
        item.caseCost,
      );

      const sellingPrice = toSafeNumber(
        item.sellingPrice,
      );

      const costValue = roundCurrency(
        quantityInStock * caseCost,
      );

      const retailValue = roundCurrency(
        quantityInStock * sellingPrice,
      );

      const potentialMargin = roundCurrency(
        Math.max(0, retailValue - costValue),
      );

      return {
        productId: item.productId,
        productName: item.productName,
        brand: item.brand,
        quantityInStock,
        costValue,
        retailValue,
        potentialMargin,
        isLowStock:
          quantityInStock <=
          toSafeNumber(item.reorderLevel),
      };
    })
    .sort(
      (first, second) =>
        second.retailValue - first.retailValue,
    );
}

function buildTopProducts(
  orders: Order[],
  invoices: Invoice[],
): TopProductAnalytics[] {
  const products = new Map<
    string,
    TopProductAnalytics
  >();

  const eligibleOrders = orders.filter(
    (order) => order.status !== "Cancelled",
  );

  eligibleOrders.forEach((order) => {
    order.items.forEach((item) => {
      const existingProduct = products.get(
        item.productId,
      );

      const quantityOrdered = toSafeNumber(
        item.quantity,
      );

      if (existingProduct) {
        existingProduct.quantityOrdered +=
          quantityOrdered;

        if (
          !existingProduct.productName &&
          item.productName
        ) {
          existingProduct.productName =
            item.productName;
        }

        return;
      }

      products.set(item.productId, {
        productId: item.productId,
        productName:
          item.productName || "Unknown product",
        quantityOrdered,
        invoicedQuantity: 0,
        invoicedRevenue: 0,
      });
    });
  });

  const eligibleInvoices = invoices.filter(
    (invoice) => invoice.status !== "Void",
  );

  eligibleInvoices.forEach((invoice) => {
    invoice.items.forEach((item) => {
      const existingProduct = products.get(
        item.productId,
      );

      const invoicedQuantity = toSafeNumber(
        item.quantity,
      );

      const invoicedRevenue = toSafeNumber(
        item.lineTotal,
      );

      if (existingProduct) {
        existingProduct.invoicedQuantity +=
          invoicedQuantity;

        existingProduct.invoicedRevenue =
          roundCurrency(
            existingProduct.invoicedRevenue +
              invoicedRevenue,
          );

        if (
          !existingProduct.productName &&
          item.productName
        ) {
          existingProduct.productName =
            item.productName;
        }

        return;
      }

      products.set(item.productId, {
        productId: item.productId,
        productName:
          item.productName || "Unknown product",
        quantityOrdered: 0,
        invoicedQuantity,
        invoicedRevenue:
          roundCurrency(invoicedRevenue),
      });
    });
  });

  return [...products.values()]
    .map((product) => ({
      ...product,
      quantityOrdered: toSafeNumber(
        product.quantityOrdered,
      ),
      invoicedQuantity: toSafeNumber(
        product.invoicedQuantity,
      ),
      invoicedRevenue: roundCurrency(
        product.invoicedRevenue,
      ),
    }))
    .sort((first, second) => {
      if (
        second.invoicedRevenue !==
        first.invoicedRevenue
      ) {
        return (
          second.invoicedRevenue -
          first.invoicedRevenue
        );
      }

      return (
        second.quantityOrdered -
        first.quantityOrdered
      );
    });
}

function buildTopCustomers(
  customers: Customer[],
  invoices: Invoice[],
): TopCustomerAnalytics[] {
  const customerAnalytics = new Map<
    string,
    TopCustomerAnalytics
  >();

  customers.forEach((customer) => {
    customerAnalytics.set(customer.customerId, {
      customerId: customer.customerId,
      businessName:
        customer.businessName ||
        "Unknown customer",
      invoiceCount: 0,
      invoicedRevenue: 0,
      amountCollected: 0,
      outstandingBalance: 0,
    });
  });

  const eligibleInvoices = invoices.filter(
    (invoice) => invoice.status !== "Void",
  );

  eligibleInvoices.forEach((invoice) => {
    const existingCustomer =
      customerAnalytics.get(invoice.customerId);

    const invoiceTotal = toSafeNumber(
      invoice.total,
    );

    const amountPaid = toSafeNumber(
      invoice.amountPaid,
    );

    const balanceDue = toSafeNumber(
      invoice.balanceDue,
    );

    if (existingCustomer) {
      existingCustomer.invoiceCount += 1;

      existingCustomer.invoicedRevenue =
        roundCurrency(
          existingCustomer.invoicedRevenue +
            invoiceTotal,
        );

      existingCustomer.amountCollected =
        roundCurrency(
          existingCustomer.amountCollected +
            amountPaid,
        );

      existingCustomer.outstandingBalance =
        roundCurrency(
          existingCustomer.outstandingBalance +
            balanceDue,
        );

      if (
        !existingCustomer.businessName &&
        invoice.businessName
      ) {
        existingCustomer.businessName =
          invoice.businessName;
      }

      return;
    }

    customerAnalytics.set(invoice.customerId, {
      customerId: invoice.customerId,
      businessName:
        invoice.businessName ||
        "Unknown customer",
      invoiceCount: 1,
      invoicedRevenue:
        roundCurrency(invoiceTotal),
      amountCollected:
        roundCurrency(amountPaid),
      outstandingBalance:
        roundCurrency(balanceDue),
    });
  });

  return [...customerAnalytics.values()]
    .filter(
      (customer) =>
        customer.invoiceCount > 0 ||
        customer.invoicedRevenue > 0,
    )
    .sort(
      (first, second) =>
        second.invoicedRevenue -
        first.invoicedRevenue,
    );
}

function buildSummary(
  customers: Customer[],
  inventoryAnalytics: InventoryAnalyticsItem[],
  orders: Order[],
  invoices: Invoice[],
): AnalyticsSummary {
  const eligibleInvoices = invoices.filter(
    (invoice) => invoice.status !== "Void",
  );

  const totalInvoicedRevenue =
    eligibleInvoices.reduce(
      (total, invoice) =>
        total + toSafeNumber(invoice.total),
      0,
    );

  const collectedRevenue =
    eligibleInvoices.reduce(
      (total, invoice) =>
        total +
        toSafeNumber(invoice.amountPaid),
      0,
    );

  const outstandingBalance =
    eligibleInvoices.reduce(
      (total, invoice) =>
        total +
        toSafeNumber(invoice.balanceDue),
      0,
    );

  const inventoryCostValue =
    inventoryAnalytics.reduce(
      (total, item) =>
        total + item.costValue,
      0,
    );

  const inventoryRetailValue =
    inventoryAnalytics.reduce(
      (total, item) =>
        total + item.retailValue,
      0,
    );

  const potentialInventoryMargin =
    inventoryAnalytics.reduce(
      (total, item) =>
        total + item.potentialMargin,
      0,
    );

  return {
    customerCount: customers.length,
    orderCount: orders.length,

    completedOrderCount: orders.filter(
      (order) => order.status === "Completed",
    ).length,

    invoiceCount: invoices.length,

    totalInvoicedRevenue: roundCurrency(
      totalInvoicedRevenue,
    ),

    collectedRevenue: roundCurrency(
      collectedRevenue,
    ),

    outstandingBalance: roundCurrency(
      outstandingBalance,
    ),

    inventoryCostValue: roundCurrency(
      inventoryCostValue,
    ),

    inventoryRetailValue: roundCurrency(
      inventoryRetailValue,
    ),

    potentialInventoryMargin: roundCurrency(
      potentialInventoryMargin,
    ),

    lowStockProductCount:
      inventoryAnalytics.filter(
        (item) => item.isLowStock,
      ).length,
  };
}

export function buildAnalytics(
  customers: Customer[],
  inventory: InventoryItem[],
  orders: Order[],
  invoices: Invoice[],
): AnalyticsData {
  const safeCustomers = Array.isArray(
    customers,
  )
    ? customers
    : [];

  const safeInventory = Array.isArray(
    inventory,
  )
    ? inventory
    : [];

  const safeOrders = Array.isArray(orders)
    ? orders
    : [];

  const safeInvoices = Array.isArray(
    invoices,
  )
    ? invoices
    : [];

  const inventoryItems =
    buildInventoryAnalytics(safeInventory);

  return {
    summary: buildSummary(
      safeCustomers,
      inventoryItems,
      safeOrders,
      safeInvoices,
    ),

    orderStatusCounts:
      buildOrderStatusCounts(safeOrders),

    invoiceStatusCounts:
      buildInvoiceStatusCounts(safeInvoices),

    topProducts: buildTopProducts(
      safeOrders,
      safeInvoices,
    ),

    topCustomers: buildTopCustomers(
      safeCustomers,
      safeInvoices,
    ),

    inventoryItems,
  };
}
