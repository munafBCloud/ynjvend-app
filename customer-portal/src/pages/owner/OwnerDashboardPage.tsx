import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

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
        console.error(
          "Unable to load owner dashboard:",
          loadError,
        );

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
        .filter(
          (invoice) => invoice.status !== "Void",
        )
        .reduce(
          (total, invoice) =>
            total +
            Number(invoice.balanceDue || 0),
          0,
        ),
    [invoices],
  );

  const lowStockItems = useMemo(
    () =>
      inventory.filter((item) => {
        const quantity = Number(
          item.quantityInStock || 0,
        );

        const reorderLevel = Number(
          item.reorderLevel || 0,
        );

        return quantity <= reorderLevel;
      }),
    [inventory],
  );

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (first, second) =>
            new Date(
              second.createdAt,
            ).getTime() -
            new Date(
              first.createdAt,
            ).getTime(),
        )
        .slice(0, 5),
    [orders],
  );

  const dashboardCards = [
    {
      label: "Open Orders",
      value: openOrders.length,
      description: "New or preparing",
      accent: "orange" as const,
    },
    {
      label: "Inventory",
      value: inventory.length,
      description: "Products tracked",
      accent: "blue" as const,
    },
    {
      label: "Low Stock",
      value: lowStockItems.length,
      description: "At or below reorder level",
      accent:
        lowStockItems.length > 0
          ? ("orange" as const)
          : ("neutral" as const),
    },
    {
      label: "Receivables",
      value: outstandingBalance.toLocaleString(
        "en-US",
        {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        },
      ),
      description: "Outstanding balance",
      accent: "blue" as const,
    },
  ];

  return (
    <section className="dd-dashboard">
      <div className="dd-dashboard__inner">
        <header className="dd-dashboard__header">
          <div>
            <div className="dd-dashboard__eyebrow">
              <span />
              Command Center
            </div>

            <h1>Business Overview</h1>

            <p>
              Live operational snapshot across
              orders, inventory, customers, and
              receivables.
            </p>
          </div>

          <div className="dd-dashboard__connection">
            <span aria-hidden="true" />
            Live Operations
          </div>
        </header>

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
            <div className="dd-dashboard__metrics">
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

            <div className="dd-dashboard__workspace">
              <section className="dd-dashboard__orders">
                <div className="dd-dashboard__section-header">
                  <div>
                    <p className="dd-label">
                      Order Activity
                    </p>

                    <h2>Recent Orders</h2>
                  </div>

                  <Link
                    to="/owner/orders"
                    className="dd-dashboard__section-link"
                  >
                    View all
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>

                {recentOrders.length === 0 ? (
                  <div className="dd-dashboard__empty">
                    <div
                      className="dd-dashboard__empty-icon"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M6 7h12l1 13H5L6 7Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                        <path
                          d="M9 9V6a3 3 0 0 1 6 0v3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    <div>
                      <strong>No orders yet</strong>
                      <p>
                        Recent order activity will
                        appear here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="dd-dashboard__order-list">
                    {recentOrders.map((order) => {
                      const totalQuantity =
                        order.items.reduce(
                          (total, item) =>
                            total + item.quantity,
                          0,
                        );

                      return (
                        <article
                          key={order.orderId}
                          className="dd-dashboard__order"
                        >
                          <div className="dd-dashboard__order-primary">
                            <div className="dd-dashboard__order-marker" />

                            <div>
                              <p className="dd-dashboard__order-business">
                                {order.businessName}
                              </p>

                              <p className="dd-dashboard__order-meta">
                                {order.items.length}{" "}
                                product
                                {order.items.length === 1
                                  ? ""
                                  : "s"}
                                <span>•</span>
                                {totalQuantity} unit
                                {totalQuantity === 1
                                  ? ""
                                  : "s"}
                              </p>
                            </div>
                          </div>

                          <div className="dd-dashboard__order-time">
                            <span>Created</span>

                            <strong>
                              {formatDate(
                                order.createdAt,
                                "dateTime",
                              )}
                            </strong>
                          </div>

                          <span
                            className={[
                              "dd-dashboard__order-status",
                              getOrderStatusClasses(
                                order.status,
                              ),
                            ].join(" ")}
                          >
                            {order.status}
                          </span>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <aside className="dd-dashboard__rail">
                <section className="dd-dashboard__rail-card">
                  <div className="dd-dashboard__rail-heading">
                    <div>
                      <p className="dd-label">
                        Attention
                      </p>
                      <h2>Operations Queue</h2>
                    </div>

                    <span className="dd-dashboard__rail-count">
                      {openOrders.length +
                        lowStockItems.length}
                    </span>
                  </div>

                  <Link
                    to="/owner/orders"
                    className="dd-dashboard__queue-item"
                  >
                    <div className="dd-dashboard__queue-icon dd-dashboard__queue-icon--orange">
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M4 6h16v13H4V6Zm3-3h10v3H7V3Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    <div>
                      <strong>
                        {openOrders.length}
                      </strong>
                      <span>Open orders</span>
                    </div>

                    <span className="dd-dashboard__queue-arrow">
                      →
                    </span>
                  </Link>

                  <Link
                    to="/owner/inventory"
                    className="dd-dashboard__queue-item"
                  >
                    <div className="dd-dashboard__queue-icon dd-dashboard__queue-icon--blue">
                      <svg viewBox="0 0 24 24">
                        <path
                          d="m4 8 8-4 8 4-8 4-8-4Zm0 0v8l8 4 8-4V8M12 12v8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    <div>
                      <strong>
                        {lowStockItems.length}
                      </strong>
                      <span>Low-stock products</span>
                    </div>

                    <span className="dd-dashboard__queue-arrow">
                      →
                    </span>
                  </Link>
                </section>

                <section className="dd-dashboard__rail-card">
                  <div className="dd-dashboard__rail-heading">
                    <div>
                      <p className="dd-label">
                        Workspace
                      </p>
                      <h2>Business Data</h2>
                    </div>
                  </div>

                  <div className="dd-dashboard__data-row">
                    <span>Customers</span>
                    <strong>
                      {customers.length}
                    </strong>
                  </div>

                  <div className="dd-dashboard__data-row">
                    <span>Total orders</span>
                    <strong>{orders.length}</strong>
                  </div>

                  <div className="dd-dashboard__data-row">
                    <span>Invoices</span>
                    <strong>
                      {invoices.length}
                    </strong>
                  </div>

                  <div className="dd-dashboard__data-row">
                    <span>Products</span>
                    <strong>
                      {inventory.length}
                    </strong>
                  </div>
                </section>

                <Link
                  to="/owner/receiving"
                  className="dd-dashboard__receive"
                >
                  <div>
                    <span className="dd-dashboard__receive-label">
                      Inventory Operations
                    </span>

                    <strong>
                      Start Receiving
                    </strong>
                  </div>

                  <span
                    className="dd-dashboard__receive-arrow"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              </aside>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
