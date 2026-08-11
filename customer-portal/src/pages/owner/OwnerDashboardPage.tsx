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
    },
    {
      label: "Open Orders",
      value: openOrders.length,
      description: "New or preparing orders",
    },
    {
      label: "Outstanding Balance",
      value: outstandingBalance.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      }),
      description: "Remaining invoice balance",
    },
    {
      label: "Inventory Products",
      value: inventory.length,
      description: "Products currently tracked",
    },
  ];

  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
          Dashboard
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          Business Overview
        </h2>

        <p className="mt-3 text-slate-600">
          Review customers, orders, outstanding balances, and
          inventory status.
        </p>

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
            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardCards.map((card) => (
                <SummaryCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  description={card.description}
                />
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h3 className="text-xl font-bold text-slate-950">
                  Recent Orders
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  The five most recently created orders.
                </p>
              </div>

              {recentOrders.length === 0 ? (
                <div className="p-6">
                  <p className="text-slate-600">
                    No orders have been created yet.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {recentOrders.map((order) => {
                    const totalQuantity = order.items.reduce(
                      (total, item) => total + item.quantity,
                      0,
                    );

                    return (
                      <article
                        key={order.orderId}
                        className="grid gap-4 px-6 py-5 md:grid-cols-[1.5fr_1fr_auto] md:items-center"
                      >
                        <div>
                          <p className="font-bold text-slate-950">
                            {order.businessName}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {order.items.length} product
                            {order.items.length === 1 ? "" : "s"} ·{" "}
                            {totalQuantity} total unit
                            {totalQuantity === 1 ? "" : "s"}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-slate-500">
                            {formatDate(order.createdAt, "dateTime")}
                          </p>

                          <p className="mt-1 break-all text-xs text-slate-400">
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
