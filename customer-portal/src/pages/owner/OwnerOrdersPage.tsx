import { useEffect, useMemo, useState } from "react";

import {
  createOrder,
  getOrders,
  updateOrderStatus as updateOrderStatusApi,
} from "../../services/orders";
import { getCustomers } from "../../services/customers";
import { getInventory } from "../../services/inventory";

import type { Customer } from "../../types/customer";
import type { InventoryItem } from "../../types/inventory";
import type {
  CreateOrderItem,
  Order,
  OrderStatus,
} from "../../types/order";

const STATUS_FILTERS = [
  "All",
  "New",
  "Preparing",
  "Completed",
  "Cancelled",
] as const;

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  New: ["New", "Preparing", "Cancelled"],
  Preparing: ["Preparing", "Completed", "Cancelled"],
  Completed: ["Completed"],
  Cancelled: ["Cancelled"],
};

type ProductQuantityMap = Record<string, number>;

export default function OwnerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [selectedStatuses, setSelectedStatuses] = useState<
    Record<string, OrderStatus>
  >({});

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(
    null,
  );

  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(
    null,
  );

  const [showCreateOrderForm, setShowCreateOrderForm] =
    useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [productQuantities, setProductQuantities] =
    useState<ProductQuantityMap>({});
  const [orderNotes, setOrderNotes] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [createOrderError, setCreateOrderError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [successMessage, setSuccessMessage] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPageData() {
      try {
        setLoading(true);
        setError("");

        const [
          loadedOrders,
          loadedCustomers,
          loadedInventory,
        ] = await Promise.all([
          getOrders(),
          getCustomers(),
          getInventory(),
        ]);

        setOrders(loadedOrders);
        setCustomers(loadedCustomers);
        setInventory(loadedInventory);

        const initialStatuses: Record<string, OrderStatus> = {};

        loadedOrders.forEach((order) => {
          initialStatuses[order.orderId] = order.status;
        });

        setSelectedStatuses(initialStatuses);
      } catch (loadError) {
        console.error("Unable to load order data:", loadError);

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load order data.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadPageData();
  }, []);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "All" || order.status === statusFilter;

      const matchesSearch =
        normalizedSearch.length === 0 ||
        order.businessName.toLowerCase().includes(normalizedSearch) ||
        order.orderId.toLowerCase().includes(normalizedSearch) ||
        order.items.some((item) =>
          item.productName.toLowerCase().includes(normalizedSearch),
        );

      return matchesStatus && matchesSearch;
    });
  }, [orders, searchTerm, statusFilter]);

  const orderCounts = useMemo(() => {
    return {
      total: orders.length,
      new: orders.filter((order) => order.status === "New").length,
      preparing: orders.filter(
        (order) => order.status === "Preparing",
      ).length,
      completed: orders.filter(
        (order) => order.status === "Completed",
      ).length,
    };
  }, [orders]);

  const selectedOrderItems = useMemo<CreateOrderItem[]>(() => {
    return Object.entries(productQuantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({
        productId,
        quantity,
      }));
  }, [productQuantities]);

  function updateProductQuantity(
    productId: string,
    quantity: number,
  ) {
    const safeQuantity = Math.max(0, Math.floor(quantity));

    setProductQuantities((currentQuantities) => ({
      ...currentQuantities,
      [productId]: safeQuantity,
    }));
  }

  function resetCreateOrderForm() {
    setSelectedCustomerId("");
    setProductQuantities({});
    setOrderNotes("");
    setCreateOrderError("");
  }

  function closeCreateOrderForm() {
    resetCreateOrderForm();
    setShowCreateOrderForm(false);
  }

  async function handleCreateOrder(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedCustomerId) {
      setCreateOrderError("Select a customer.");
      return;
    }

    if (selectedOrderItems.length === 0) {
      setCreateOrderError(
        "Add at least one product with a quantity greater than zero.",
      );
      return;
    }

    try {
      setCreatingOrder(true);
      setCreateOrderError("");
      setSuccessMessage("");
      setUpdateError("");

      const newOrder = await createOrder({
        customerId: selectedCustomerId,
        notes: orderNotes.trim(),
        items: selectedOrderItems,
      });

      setOrders((currentOrders) => [
        newOrder,
        ...currentOrders,
      ]);

      setSelectedStatuses((currentStatuses) => ({
        ...currentStatuses,
        [newOrder.orderId]: newOrder.status,
      }));

      setSuccessMessage(
        `Order created successfully for ${newOrder.businessName}.`,
      );

      closeCreateOrderForm();
      setExpandedOrderId(newOrder.orderId);
    } catch (createError) {
      console.error("Unable to create order:", createError);

      setCreateOrderError(
        createError instanceof Error
          ? createError.message
          : "Unable to create order.",
      );
    } finally {
      setCreatingOrder(false);
    }
  }

  async function handleUpdateOrderStatus(orderId: string) {
    const selectedStatus = selectedStatuses[orderId];
    const currentOrder = orders.find(
      (order) => order.orderId === orderId,
    );

    if (!selectedStatus || !currentOrder) {
      setUpdateError("Select a valid order status.");
      return;
    }

    if (selectedStatus === currentOrder.status) {
      return;
    }

    try {
      setUpdatingOrderId(orderId);
      setSuccessMessage("");
      setUpdateError("");

      const updatedOrder = await updateOrderStatusApi(
        orderId,
        selectedStatus,
      );

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.orderId === orderId ? updatedOrder : order,
        ),
      );

      setSelectedStatuses((currentStatuses) => ({
        ...currentStatuses,
        [orderId]: updatedOrder.status,
      }));

      setSuccessMessage(
        `Order status updated to ${updatedOrder.status}.`,
      );
    } catch (updateStatusError) {
      console.error(
        "Unable to update order status:",
        updateStatusError,
      );

      setUpdateError(
        updateStatusError instanceof Error
          ? updateStatusError.message
          : "Unable to update order status.",
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function formatDate(dateValue: string) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function getTotalQuantity(order: Order) {
    return order.items.reduce(
      (total, item) => total + item.quantity,
      0,
    );
  }

  function getStatusClasses(status: OrderStatus) {
    if (status === "New") {
      return "bg-blue-100 text-blue-800";
    }

    if (status === "Preparing") {
      return "bg-amber-100 text-amber-800";
    }

    if (status === "Completed") {
      return "bg-green-100 text-green-800";
    }

    return "bg-slate-200 text-slate-700";
  }

  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
              Fulfillment
            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-950">
              Order Management
            </h2>

            <p className="mt-3 text-slate-600">
              Create distributor orders and manage fulfillment status.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowCreateOrderForm((currentValue) => !currentValue)
            }
            className="w-fit rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            {showCreateOrderForm ? "Close Form" : "Create Order"}
          </button>
        </div>

        {successMessage && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-800">
              {successMessage}
            </p>
          </div>
        )}

        {updateError && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-red-800">
              {updateError}
            </p>
          </div>
        )}

        {showCreateOrderForm && (
          <form
            onSubmit={handleCreateOrder}
            className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="border-b border-slate-200 pb-5">
              <h3 className="text-xl font-bold text-slate-950">
                Create New Order
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                Select a customer and add inventory products.
              </p>
            </div>

            {createOrderError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="font-semibold text-red-800">
                  {createOrderError}
                </p>
              </div>
            )}

            <div className="mt-6">
              <label
                htmlFor="order-customer"
                className="block text-sm font-semibold text-slate-700"
              >
                Customer
              </label>

              <select
                id="order-customer"
                value={selectedCustomerId}
                onChange={(event) =>
                  setSelectedCustomerId(event.target.value)
                }
                disabled={creatingOrder}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
              >
                <option value="">Select a customer</option>

                {customers.map((customer) => (
                  <option
                    key={customer.customerId}
                    value={customer.customerId}
                  >
                    {customer.businessName} — {customer.contactName}
                  </option>
                ))}
              </select>

              {customers.length === 0 && (
                <p className="mt-2 text-sm text-amber-700">
                  No customers are available. Add a customer first.
                </p>
              )}
            </div>

            <div className="mt-7">
              <div>
                <h4 className="font-bold text-slate-950">
                  Inventory Products
                </h4>

                <p className="mt-1 text-sm text-slate-600">
                  Enter the number of cases for each product.
                </p>
              </div>

              {inventory.length === 0 ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    No inventory products are available.
                  </p>
                </div>
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                  <div className="divide-y divide-slate-200">
                    {inventory.map((product) => {
                      const quantity =
                        productQuantities[product.productId] || 0;

                      return (
                        <div
                          key={product.productId}
                          className="grid gap-4 bg-white px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                        >
                          <div>
                            <p className="font-semibold text-slate-950">
                              {product.productName}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {product.brand} ·{" "}
                              {product.quantityInStock} in stock
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateProductQuantity(
                                  product.productId,
                                  quantity - 1,
                                )
                              }
                              disabled={
                                creatingOrder || quantity === 0
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              −
                            </button>

                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={quantity}
                              onChange={(event) =>
                                updateProductQuantity(
                                  product.productId,
                                  Number(event.target.value),
                                )
                              }
                              disabled={creatingOrder}
                              aria-label={`Quantity for ${product.productName}`}
                              className="h-10 w-20 rounded-lg border border-slate-300 px-3 text-center font-semibold text-slate-950 outline-none focus:border-red-700"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                updateProductQuantity(
                                  product.productId,
                                  quantity + 1,
                                )
                              }
                              disabled={creatingOrder}
                              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-7">
              <label
                htmlFor="order-notes"
                className="block text-sm font-semibold text-slate-700"
              >
                Order Notes
              </label>

              <textarea
                id="order-notes"
                rows={4}
                value={orderNotes}
                onChange={(event) =>
                  setOrderNotes(event.target.value)
                }
                disabled={creatingOrder}
                placeholder="Example: Deliver Friday morning"
                className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCreateOrderForm}
                disabled={creatingOrder}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  creatingOrder ||
                  customers.length === 0 ||
                  inventory.length === 0
                }
                className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {creatingOrder
                  ? "Creating Order..."
                  : `Create Order (${selectedOrderItems.length} products)`}
              </button>
            </div>
          </form>
        )}

        {loading && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-slate-600">Loading orders...</p>
          </div>
        )}

        {!loading && error && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
            <p className="font-semibold text-red-800">
              Unable to load orders
            </p>

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total Orders"
                value={orderCounts.total}
              />

              <SummaryCard label="New" value={orderCounts.new} />

              <SummaryCard
                label="Preparing"
                value={orderCounts.preparing}
              />

              <SummaryCard
                label="Completed"
                value={orderCounts.completed}
              />
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <label
                    htmlFor="order-search"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Search orders
                  </label>

                  <input
                    id="order-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.target.value)
                    }
                    placeholder="Search business, product, or order ID"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Filter by status
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {STATUS_FILTERS.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setStatusFilter(status)}
                        className={[
                          "rounded-xl px-4 py-3 text-sm font-semibold transition",
                          statusFilter === status
                            ? "bg-slate-950 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                        ].join(" ")}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h3 className="text-xl font-bold text-slate-950">
                  Distributor Orders
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  Showing {filteredOrders.length} of {orders.length}{" "}
                  orders.
                </p>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="font-semibold text-slate-800">
                    No orders found
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Try changing the search term or status filter.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {filteredOrders.map((order) => {
                    const selectedStatus =
                      selectedStatuses[order.orderId] ||
                      order.status;

                    const statusHasChanged =
                      selectedStatus !== order.status;

                    const isUpdating =
                      updatingOrderId === order.orderId;

                    const isExpanded =
                      expandedOrderId === order.orderId;

                    const allowedStatuses =
                      STATUS_TRANSITIONS[order.status];

                    return (
                      <article key={order.orderId}>
                        <div className="grid gap-5 px-6 py-5 lg:grid-cols-[1.5fr_auto_auto_auto_auto] lg:items-center">
                          <div>
                            <p className="font-bold text-slate-950">
                              {order.businessName}
                            </p>

                            <p className="mt-1 max-w-80 truncate text-xs text-slate-500">
                              {order.orderId}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Products
                            </p>

                            <p className="mt-1 font-semibold text-slate-950">
                              {order.items.length}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Cases
                            </p>

                            <p className="mt-1 font-semibold text-slate-950">
                              {getTotalQuantity(order)}
                            </p>
                          </div>

                          <div>
                            <span
                              className={[
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                                getStatusClasses(order.status),
                              ].join(" ")}
                            >
                              {order.status}
                            </span>

                            <p className="mt-2 whitespace-nowrap text-xs text-slate-500">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOrderId(
                                isExpanded ? null : order.orderId,
                              )
                            }
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            {isExpanded
                              ? "Hide Details"
                              : "View Details"}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-slate-200 bg-slate-50 px-6 py-6">
                            <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
                              <div>
                                <h4 className="font-bold text-slate-950">
                                  Order Items
                                </h4>

                                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                  <div className="divide-y divide-slate-200">
                                    {order.items.map((item) => (
                                      <div
                                        key={item.productId}
                                        className="flex items-center justify-between gap-4 px-4 py-4"
                                      >
                                        <div>
                                          <p className="font-semibold text-slate-950">
                                            {item.productName}
                                          </p>

                                          <p className="mt-1 text-xs text-slate-500">
                                            {item.productId}
                                          </p>
                                        </div>

                                        <p className="font-bold text-slate-950">
                                          Qty {item.quantity}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="mt-5">
                                  <h4 className="font-bold text-slate-950">
                                    Notes
                                  </h4>

                                  <p className="mt-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                                    {order.notes?.trim()
                                      ? order.notes
                                      : "No notes were added to this order."}
                                  </p>
                                </div>
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-white p-5">
                                <h4 className="font-bold text-slate-950">
                                  Update Status
                                </h4>

                                <p className="mt-2 text-sm text-slate-600">
                                  Current status: {order.status}
                                </p>

                                <select
                                  value={selectedStatus}
                                  onChange={(event) =>
                                    setSelectedStatuses(
                                      (currentStatuses) => ({
                                        ...currentStatuses,
                                        [order.orderId]:
                                          event.target
                                            .value as OrderStatus,
                                      }),
                                    )
                                  }
                                  disabled={
                                    isUpdating ||
                                    allowedStatuses.length === 1
                                  }
                                  className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-red-700 disabled:bg-slate-100"
                                >
                                  {allowedStatuses.map((status) => (
                                    <option
                                      key={status}
                                      value={status}
                                    >
                                      {status}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleUpdateOrderStatus(
                                      order.orderId,
                                    )
                                  }
                                  disabled={
                                    !statusHasChanged ||
                                    isUpdating ||
                                    allowedStatuses.length === 1
                                  }
                                  className="mt-3 w-full rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                  {isUpdating
                                    ? "Saving..."
                                    : "Update Status"}
                                </button>

                                {allowedStatuses.length === 1 && (
                                  <p className="mt-3 text-xs text-slate-500">
                                    This order has reached a final status
                                    and can no longer be changed.
                                  </p>
                                )}

                                <div className="mt-5 border-t border-slate-200 pt-4">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Last Updated
                                  </p>

                                  <p className="mt-1 text-sm text-slate-700">
                                    {formatDate(order.updatedAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
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

type SummaryCardProps = {
  label: string;
  value: number;
};

function SummaryCard({
  label,
  value,
}: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-4xl font-bold text-slate-950">
        {value}
      </p>
    </article>
  );
}
