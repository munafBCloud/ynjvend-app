import { useEffect, useMemo, useState } from "react";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import SummaryCard from "../../components/SummaryCard";

import { getCustomers } from "../../services/customers";
import { getInventory } from "../../services/inventory";
import { getOrders } from "../../services/orders";
import { getInvoices } from "../../services/invoices";

import { formatDate } from "../../utils/formatters";
import { getOrderStatusClasses } from "../../utils/status";

import type { Customer } from "../../types/customer";
import type { InventoryItem } from "../../types/inventory";
import type { Order } from "../../types/order";
import type { Invoice } from "../../types/invoice";

export default function OwnerDashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
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
        console.error("Unable to load owner dashboard:", loadError);

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load dashboard data.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  const openOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "New" ||
          order.status === "Preparing",
      ),
    [orders],
  );

  const outstandingBalance = useMemo(
    () =>
      invoices
        .filter((invoice) => invoice.status !== "Void")
        .reduce(
          (total, invoice) =>
            total + Number(invoice.balanceDue || 0),
          0,
        ),
    [invoices],
  );

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (first, second) =>
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime(),
        )
        .slice(0, 5),
    [orders],
  );

  const dashboardCards = [
    {
      label: "Total Customers",
      value: customers.length,
      description: "Active business customers",
      accent: "blue" as const,
    },
    {
      label: "Open Orders",
      value: openOrders.length,
      description: "New or preparing orders",
      accent: "orange" as const,
    },
    {
      label: "Outstanding Balance",
      value: outstandingBalance.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      }),
      description: "Remaining invoice balance",
      accent: "orange" as const,
    },
    {
      label: "Inventory Products",
      value: inventory.length,
      description: "Products currently tracked",
      accent: "blue" as const,
    },
  ];

  return (
    <section className="px-5 py-7 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-col gap-4 border-b border-[var(--dd-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="dd-accent-line" />

              <p className="dd-label text-[var(--dd-orange)]">
                Command Center
              </p>
            </div>

            <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--dd-text)] sm:text-3xl">
              Business Overview
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-[var(--dd-text-secondary)]">
              Live operational snapshot across orders, inventory,
              customers, and receivables.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--dd-text-muted)]">
            <span className="h-2 w-2 rounded-full bg-[var(--dd-success)]" />
            Data connected
          </div>
        </div>

        {loading && (
          <LoadingState message="Loading dashboard data..." />
        )}

        {!loading && error && (
          <ErrorMessage
            title="Unable to load dashboard"
            message={error}
          />
        )}

        {!loading && !error && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardCards.map((card) => (
                <SummaryCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  description={card.description}
                  accent={card.accent}
                />
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-[var(--dd-border)] bg-[var(--dd-surface)]">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--dd-border)] px-5 py-4">
                <div>
                  <p className="dd-label">
                    Order Activity
                  </p>

                  <h3 className="mt-1 text-base font-bold text-[var(--dd-text)]">
                    Recent Orders
                  </h3>
                </div>

                <span className="text-xs text-[var(--dd-text-muted)]">
                  Latest 5
                </span>
              </div>

              {recentOrders.length === 0 ? (
                <div className="p-6">
                  <p className="text-sm text-[var(--dd-text-muted)]">
                    No orders have been created yet.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--dd-border)]">
                  {recentOrders.map((order) => {
                    const totalQuantity = order.items.reduce(
                      (total, item) => total + item.quantity,
                      0,
                    );

                    return (
                      <article
                        key={order.orderId}
                        className="grid gap-4 px-5 py-4 transition hover:bg-[var(--dd-surface-raised)] md:grid-cols-[1.5fr_1fr_auto] md:items-center"
                      >
                        <div>
                          <p className="font-semibold text-[var(--dd-text)]">
                            {order.businessName}
                          </p>

                          <p className="mt-1 text-xs text-[var(--dd-text-secondary)]">
                            {order.items.length} product
                            {order.items.length === 1 ? "" : "s"} ·{" "}
                            {totalQuantity} total unit
                            {totalQuantity === 1 ? "" : "s"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-[var(--dd-text-secondary)]">
                            {formatDate(order.createdAt, "dateTime")}
                          </p>

                          <p className="mt-1 break-all font-mono text-[10px] text-[var(--dd-text-muted)]">
                            {order.orderId}
                          </p>
                        </div>

                        <span
                          className={[
                            "w-fit rounded-full px-3 py-1 text-xs font-semibold",
                            getOrderStatusClasses(order.status),
                          ].join(" ")}
                        >
                          {order.status}
                        </span>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
