import { useEffect, useMemo, useState } from "react";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import SummaryCard from "../../components/SummaryCard";

import { getCustomers } from "../../services/customers";
import { getInventory } from "../../services/inventory";
import { getInvoices } from "../../services/invoices";
import { getOrders } from "../../services/orders";

import type { Customer } from "../../types/customer";
import type { InventoryItem } from "../../types/inventory";
import type { Invoice } from "../../types/invoice";
import type { Order } from "../../types/order";

import { buildAnalytics } from "../../utils/analytics";
import { formatCurrency, formatNumber } from "../../utils/formatters";

export default function OwnerAnalyticsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAnalyticsData() {
      try {
        setLoading(true);
        setError("");

        const [
          loadedCustomers,
          loadedInventory,
          loadedOrders,
          loadedInvoices,
        ] = await Promise.all([
          getCustomers(),
          getInventory(),
          getOrders(),
          getInvoices(),
        ]);

        setCustomers(loadedCustomers);
        setInventory(loadedInventory);
        setOrders(loadedOrders);
        setInvoices(loadedInvoices);
      } catch (loadError) {
        console.error(
          "Unable to load analytics data:",
          loadError,
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load analytics data.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadAnalyticsData();
  }, []);

  const analytics = useMemo(
    () =>
      buildAnalytics(
        customers,
        inventory,
        orders,
        invoices,
      ),
    [customers, inventory, orders, invoices],
  );

  const topProducts = analytics.topProducts.slice(0, 5);
  const topCustomers = analytics.topCustomers.slice(0, 5);

  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
            Analytics
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            Business Performance
          </h2>

          <p className="mt-3 max-w-3xl text-slate-600">
            Review revenue, receivables, inventory value,
            customer performance, and product activity.
          </p>
        </div>

        {loading && (
          <LoadingState message="Loading analytics..." />
        )}

        {!loading && error && (
          <ErrorMessage
            title="Unable to load analytics"
            message={error}
          />
        )}

        {!loading && !error && (
          <>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total Invoiced"
                value={formatCurrency(
                  analytics.summary.totalInvoicedRevenue,
                )}
                description="Excludes void invoices"
              />

              <SummaryCard
                label="Collected Revenue"
                value={formatCurrency(
                  analytics.summary.collectedRevenue,
                )}
                description="Payments recorded"
              />

              <SummaryCard
                label="Outstanding Balance"
                value={formatCurrency(
                  analytics.summary.outstandingBalance,
                )}
                description="Remaining receivables"
              />

              <SummaryCard
                label="Inventory at Cost"
                value={formatCurrency(
                  analytics.summary.inventoryCostValue,
                )}
                description="Current stock value"
              />

              <SummaryCard
                label="Potential Inventory Revenue"
                value={formatCurrency(
                  analytics.summary.inventoryRetailValue,
                )}
                description="Based on current selling prices"
              />

              <SummaryCard
                label="Potential Inventory Margin"
                value={formatCurrency(
                  analytics.summary.potentialInventoryMargin,
                )}
                description="Current retail value minus cost"
              />

              <SummaryCard
                label="Completed Orders"
                value={formatNumber(
                  analytics.summary.completedOrderCount,
                )}
                description={`${formatNumber(
                  analytics.summary.orderCount,
                )} total orders`}
              />

              <SummaryCard
                label="Low Stock Products"
                value={formatNumber(
                  analytics.summary.lowStockProductCount,
                )}
                description={`${formatNumber(
                  analytics.summary.customerCount,
                )} customers`}
              />
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-2">
              <AnalyticsPanel
                title="Order Status"
                description="Current order distribution"
              >
                <div className="space-y-3">
                  {analytics.orderStatusCounts.map(
                    (item) => (
                      <MetricRow
                        key={item.status}
                        label={item.status}
                        value={formatNumber(item.count)}
                      />
                    ),
                  )}
                </div>
              </AnalyticsPanel>

              <AnalyticsPanel
                title="Invoice Status"
                description="Current invoice distribution"
              >
                <div className="space-y-3">
                  {analytics.invoiceStatusCounts.map(
                    (item) => (
                      <MetricRow
                        key={item.status}
                        label={item.status}
                        value={formatNumber(item.count)}
                      />
                    ),
                  )}
                </div>
              </AnalyticsPanel>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-2">
              <AnalyticsPanel
                title="Top Products"
                description="Ranked by invoiced revenue"
              >
                {topProducts.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No product sales data is available yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {topProducts.map((product) => (
                      <div
                        key={product.productId}
                        className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">
                            {product.productName}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {formatNumber(
                              product.invoicedQuantity,
                            )}{" "}
                            invoiced ·{" "}
                            {formatNumber(
                              product.quantityOrdered,
                            )}{" "}
                            ordered
                          </p>
                        </div>

                        <p className="font-bold text-slate-950">
                          {formatCurrency(
                            product.invoicedRevenue,
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </AnalyticsPanel>

              <AnalyticsPanel
                title="Top Customers"
                description="Ranked by invoiced revenue"
              >
                {topCustomers.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No customer invoice data is available yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {topCustomers.map((customer) => (
                      <div
                        key={customer.customerId}
                        className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">
                            {customer.businessName}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {formatNumber(
                              customer.invoiceCount,
                            )}{" "}
                            invoices ·{" "}
                            {formatCurrency(
                              customer.outstandingBalance,
                            )}{" "}
                            outstanding
                          </p>
                        </div>

                        <p className="font-bold text-slate-950">
                          {formatCurrency(
                            customer.invoicedRevenue,
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </AnalyticsPanel>
            </div>

            <div className="mt-8">
              <AnalyticsPanel
                title="Inventory Valuation"
                description="Highest-value inventory products"
              >
                {analytics.inventoryItems.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No inventory data is available.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead>
                        <tr>
                          <TableHeading>Product</TableHeading>
                          <TableHeading>In Stock</TableHeading>
                          <TableHeading>Cost Value</TableHeading>
                          <TableHeading>Retail Value</TableHeading>
                          <TableHeading>
                            Potential Margin
                          </TableHeading>
                          <TableHeading>Status</TableHeading>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-200">
                        {analytics.inventoryItems
                          .slice(0, 10)
                          .map((item) => (
                            <tr key={item.productId}>
                              <TableCell>
                                <p className="font-semibold text-slate-950">
                                  {item.productName}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {item.brand}
                                </p>
                              </TableCell>

                              <TableCell>
                                {formatNumber(
                                  item.quantityInStock,
                                )}
                              </TableCell>

                              <TableCell>
                                {formatCurrency(
                                  item.costValue,
                                )}
                              </TableCell>

                              <TableCell>
                                {formatCurrency(
                                  item.retailValue,
                                )}
                              </TableCell>

                              <TableCell>
                                {formatCurrency(
                                  item.potentialMargin,
                                )}
                              </TableCell>

                              <TableCell>
                                <span
                                  className={[
                                    "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                                    item.isLowStock
                                      ? "bg-red-100 text-red-800"
                                      : "bg-green-100 text-green-800",
                                  ].join(" ")}
                                >
                                  {item.isLowStock
                                    ? "Low Stock"
                                    : "In Stock"}
                                </span>
                              </TableCell>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </AnalyticsPanel>
            </div>

            <p className="mt-6 text-xs text-slate-500">
              Inventory margin is an estimate based on current
              inventory cost and selling price. It is not historical
              realized gross profit.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

type AnalyticsPanelProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function AnalyticsPanel({
  title,
  description,
  children,
}: AnalyticsPanelProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-bold text-slate-950">
        {title}
      </h3>

      <p className="mt-1 text-sm text-slate-600">
        {description}
      </p>

      <div className="mt-5">
        {children}
      </div>
    </article>
  );
}

type MetricRowProps = {
  label: string;
  value: string;
};

function MetricRow({
  label,
  value,
}: MetricRowProps) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="font-medium text-slate-700">
        {label}
      </span>

      <span className="font-bold text-slate-950">
        {value}
      </span>
    </div>
  );
}

type TableContentProps = {
  children: React.ReactNode;
};

function TableHeading({
  children,
}: TableContentProps) {
  return (
    <th
      scope="col"
      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
}: TableContentProps) {
  return (
    <td className="px-4 py-4 text-sm text-slate-700">
      {children}
    </td>
  );
}
