import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import SummaryCard from "../../components/SummaryCard";

import {
  createOrder,
  getOrders,
  updateOrderStatus as updateOrderStatusApi,
} from "../../services/orders";

import { getCustomers } from "../../services/customers";
import { getInventory } from "../../services/inventory";

import {
  formatCurrency,
  formatDate,
} from "../../utils/formatters";

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

const STATUS_TRANSITIONS: Record<
  OrderStatus,
  OrderStatus[]
> = {
  New: ["New", "Preparing", "Cancelled"],
  Preparing: [
    "Preparing",
    "Completed",
    "Cancelled",
  ],
  Completed: ["Completed"],
  Cancelled: ["Cancelled"],
};

type ProductQuantityMap =
  Record<string, number>;

export default function OwnerOrdersPage() {
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [inventory, setInventory] =
    useState<InventoryItem[]>([]);

  const [
    selectedStatuses,
    setSelectedStatuses,
  ] = useState<
    Record<string, OrderStatus>
  >({});

  const [
    expandedOrderId,
    setExpandedOrderId,
  ] = useState<string | null>(null);

  const [
    updatingOrderId,
    setUpdatingOrderId,
  ] = useState<string | null>(null);

  const [
    showCreateOrderForm,
    setShowCreateOrderForm,
  ] = useState(false);

  const [
    selectedCustomerId,
    setSelectedCustomerId,
  ] = useState("");

  const [
    productQuantities,
    setProductQuantities,
  ] = useState<ProductQuantityMap>(
    {},
  );

  const [orderNotes, setOrderNotes] =
    useState("");

  const [
    creatingOrder,
    setCreatingOrder,
  ] = useState(false);

  const [
    createOrderError,
    setCreateOrderError,
  ] = useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [updateError, setUpdateError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

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

        const initialStatuses:
          Record<string, OrderStatus> =
            {};

        loadedOrders.forEach(
          (order) => {
            initialStatuses[
              order.orderId
            ] = order.status;
          },
        );

        setSelectedStatuses(
          initialStatuses,
        );
      } catch (loadError) {
        console.error(
          "Unable to load order data:",
          loadError,
        );

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

  const filteredOrders = useMemo(
    () => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          const matchesStatus =
            statusFilter === "All" ||
            order.status ===
              statusFilter;

          const matchesSearch =
            normalizedSearch.length ===
              0 ||
            order.businessName
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            order.orderId
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            order.items.some((item) =>
              item.productName
                .toLowerCase()
                .includes(
                  normalizedSearch,
                ),
            );

          return (
            matchesStatus &&
            matchesSearch
          );
        },
      );
    },
    [
      orders,
      searchTerm,
      statusFilter,
    ],
  );

  const orderCounts = useMemo(
    () => ({
      total: orders.length,

      new: orders.filter(
        (order) =>
          order.status === "New",
      ).length,

      preparing: orders.filter(
        (order) =>
          order.status ===
          "Preparing",
      ).length,

      completed: orders.filter(
        (order) =>
          order.status ===
          "Completed",
      ).length,
    }),
    [orders],
  );

  const selectedOrderItems =
    useMemo<CreateOrderItem[]>(
      () =>
        Object.entries(
          productQuantities,
        )
          .filter(
            ([, quantity]) =>
              quantity > 0,
          )
          .map(
            ([
              productId,
              quantity,
            ]) => ({
              productId,
              quantity,
            }),
          ),
      [productQuantities],
    );

  const selectedCases = useMemo(
    () =>
      selectedOrderItems.reduce(
        (total, item) =>
          total + item.quantity,
        0,
      ),
    [selectedOrderItems],
  );

  function updateProductQuantity(
    productId: string,
    quantity: number,
  ) {
    const safeQuantity = Math.max(
      0,
      Math.floor(quantity),
    );

    setProductQuantities(
      (currentQuantities) => ({
        ...currentQuantities,
        [productId]:
          safeQuantity,
      }),
    );
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
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedCustomerId) {
      setCreateOrderError(
        "Select a customer.",
      );
      return;
    }

    if (
      selectedOrderItems.length === 0
    ) {
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

      const newOrder =
        await createOrder({
          customerId:
            selectedCustomerId,
          notes: orderNotes.trim(),
          items: selectedOrderItems,
        });

      setOrders(
        (currentOrders) => [
          newOrder,
          ...currentOrders,
        ],
      );

      setSelectedStatuses(
        (currentStatuses) => ({
          ...currentStatuses,
          [newOrder.orderId]:
            newOrder.status,
        }),
      );

      setSuccessMessage(
        `Order created successfully for ${newOrder.businessName}.`,
      );

      closeCreateOrderForm();

      setExpandedOrderId(
        newOrder.orderId,
      );
    } catch (createError) {
      console.error(
        "Unable to create order:",
        createError,
      );

      setCreateOrderError(
        createError instanceof Error
          ? createError.message
          : "Unable to create order.",
      );
    } finally {
      setCreatingOrder(false);
    }
  }

  async function handleUpdateOrderStatus(
    orderId: string,
  ) {
    const selectedStatus =
      selectedStatuses[orderId];

    const currentOrder =
      orders.find(
        (order) =>
          order.orderId ===
          orderId,
      );

    if (
      !selectedStatus ||
      !currentOrder
    ) {
      setUpdateError(
        "Select a valid order status.",
      );
      return;
    }

    if (
      selectedStatus ===
      currentOrder.status
    ) {
      return;
    }

    try {
      setUpdatingOrderId(
        orderId,
      );

      setSuccessMessage("");
      setUpdateError("");

      const updatedOrder =
        await updateOrderStatusApi(
          orderId,
          selectedStatus,
        );

      setOrders(
        (currentOrders) =>
          currentOrders.map(
            (order) =>
              order.orderId ===
              orderId
                ? updatedOrder
                : order,
          ),
      );

      setSelectedStatuses(
        (currentStatuses) => ({
          ...currentStatuses,
          [orderId]:
            updatedOrder.status,
        }),
      );

      setSuccessMessage(
        `Order status updated to ${updatedOrder.status}.`,
      );
    } catch (updateStatusError) {
      console.error(
        "Unable to update order status:",
        updateStatusError,
      );

      setUpdateError(
        updateStatusError instanceof
          Error
          ? updateStatusError.message
          : "Unable to update order status.",
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function getTotalQuantity(
    order: Order,
  ) {
    return order.items.reduce(
      (total, item) =>
        total + item.quantity,
      0,
    );
  }

  return (
    <section className="dd-orders">
      <div className="dd-orders__inner">
        <header className="dd-orders__header">
          <div>
            <div className="dd-orders__eyebrow">
              <span />
              Fulfillment Operations
            </div>

            <h1>
              Order Management
            </h1>

            <p>
              Create distributor
              orders and move
              fulfillment from intake
              through completion.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (
                showCreateOrderForm
              ) {
                closeCreateOrderForm();
              } else {
                setSuccessMessage(
                  "",
                );
                setShowCreateOrderForm(
                  true,
                );
              }
            }}
            className={[
              "dd-orders__create-toggle",
              showCreateOrderForm
                ? "dd-orders__create-toggle--close"
                : "",
            ].join(" ")}
          >
            <span>
              {showCreateOrderForm
                ? "×"
                : "+"}
            </span>

            {showCreateOrderForm
              ? "Close Form"
              : "Create Order"}
          </button>
        </header>

        {successMessage && (
          <div className="dd-orders__success">
            <span />
            {successMessage}
          </div>
        )}

        {updateError && (
          <ErrorMessage
            title="Unable to update order"
            message={updateError}
          />
        )}

        {showCreateOrderForm && (
          <form
            onSubmit={
              handleCreateOrder
            }
            className="dd-order-create"
          >
            <header className="dd-order-create__header">
              <div>
                <div className="dd-order-create__eyebrow">
                  New Order
                </div>

                <h2>
                  Build Distributor
                  Order
                </h2>

                <p>
                  Select the customer
                  and cases required.
                  Final pricing is
                  calculated by the
                  order service.
                </p>
              </div>

              <div className="dd-order-create__selection">
                <span>
                  {
                    selectedOrderItems.length
                  }{" "}
                  Products
                </span>

                <strong>
                  {selectedCases} Cases
                </strong>
              </div>
            </header>

            {createOrderError && (
              <div
                className="dd-order-create__error"
                role="alert"
              >
                <span>!</span>

                <div>
                  <strong>
                    Order could not
                    be created
                  </strong>

                  <p>
                    {createOrderError}
                  </p>
                </div>
              </div>
            )}

            <section className="dd-order-create__section">
              <div className="dd-order-create__section-label">
                <span>01</span>

                <div>
                  <strong>
                    Customer
                  </strong>

                  <p>
                    Select the account
                    placing this order.
                  </p>
                </div>
              </div>

              <div className="dd-order-create__section-content">
                <label
                  htmlFor="order-customer"
                  className="dd-order-create__field-label"
                >
                  Business Customer
                </label>

                <select
                  id="order-customer"
                  value={
                    selectedCustomerId
                  }
                  onChange={(event) =>
                    setSelectedCustomerId(
                      event.target
                        .value,
                    )
                  }
                  disabled={
                    creatingOrder
                  }
                  className="dd-order-create__select"
                >
                  <option value="">
                    Select a customer
                  </option>

                  {customers.map(
                    (customer) => (
                      <option
                        key={
                          customer.customerId
                        }
                        value={
                          customer.customerId
                        }
                      >
                        {
                          customer.businessName
                        }{" "}
                        —{" "}
                        {
                          customer.contactName
                        }
                      </option>
                    ),
                  )}
                </select>

                {customers.length ===
                  0 && (
                  <p className="dd-order-create__warning">
                    No customers are
                    available. Add a
                    customer first.
                  </p>
                )}
              </div>
            </section>

            <section className="dd-order-create__section">
              <div className="dd-order-create__section-label">
                <span>02</span>

                <div>
                  <strong>
                    Products
                  </strong>

                  <p>
                    Enter case
                    quantities for
                    this order.
                  </p>
                </div>
              </div>

              <div className="dd-order-create__section-content">
                {inventory.length ===
                0 ? (
                  <div className="dd-order-create__warning">
                    No inventory
                    products are
                    available.
                  </div>
                ) : (
                  <div className="dd-order-create__products">
                    {inventory.map(
                      (product) => {
                        const quantity =
                          productQuantities[
                            product
                              .productId
                          ] || 0;

                        const selected =
                          quantity > 0;

                        return (
                          <article
                            key={
                              product.productId
                            }
                            className={[
                              "dd-order-create__product",
                              selected
                                ? "dd-order-create__product--selected"
                                : "",
                            ].join(" ")}
                          >
                            <div className="dd-order-create__product-info">
                              <div className="dd-order-create__product-marker" />

                              <div>
                                <strong>
                                  {
                                    product.productName
                                  }
                                </strong>

                                <p>
                                  {
                                    product.brand
                                  }{" "}
                                  ·{" "}
                                  {
                                    product.quantityInStock
                                  }{" "}
                                  in stock
                                </p>

                                <span>
                                  {formatCurrency(
                                    product.sellingPrice,
                                  )}{" "}
                                  / case
                                </span>
                              </div>
                            </div>

                            <div className="dd-order-create__quantity">
                              <button
                                type="button"
                                onClick={() =>
                                  updateProductQuantity(
                                    product.productId,
                                    quantity -
                                      1,
                                  )
                                }
                                disabled={
                                  creatingOrder ||
                                  quantity ===
                                    0
                                }
                                aria-label={`Decrease ${product.productName} quantity`}
                              >
                                −
                              </button>

                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={
                                  quantity
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateProductQuantity(
                                    product.productId,
                                    Number(
                                      event
                                        .target
                                        .value,
                                    ),
                                  )
                                }
                                disabled={
                                  creatingOrder
                                }
                                aria-label={`Quantity for ${product.productName}`}
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  updateProductQuantity(
                                    product.productId,
                                    quantity +
                                      1,
                                  )
                                }
                                disabled={
                                  creatingOrder
                                }
                                aria-label={`Increase ${product.productName} quantity`}
                              >
                                +
                              </button>
                            </div>
                          </article>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="dd-order-create__section">
              <div className="dd-order-create__section-label">
                <span>03</span>

                <div>
                  <strong>
                    Notes
                  </strong>

                  <p>
                    Optional
                    fulfillment
                    instructions.
                  </p>
                </div>
              </div>

              <div className="dd-order-create__section-content">
                <label
                  htmlFor="order-notes"
                  className="dd-order-create__field-label"
                >
                  Order Notes
                </label>

                <textarea
                  id="order-notes"
                  rows={3}
                  value={orderNotes}
                  onChange={(event) =>
                    setOrderNotes(
                      event.target
                        .value,
                    )
                  }
                  disabled={
                    creatingOrder
                  }
                  placeholder="Example: Deliver Friday morning"
                  className="dd-order-create__textarea"
                />
              </div>
            </section>

            <footer className="dd-order-create__footer">
              <div>
                <span>
                  {
                    selectedOrderItems.length
                  }{" "}
                  products selected
                </span>

                <strong>
                  {selectedCases} total
                  cases
                </strong>
              </div>

              <div className="dd-order-create__actions">
                <button
                  type="button"
                  onClick={
                    closeCreateOrderForm
                  }
                  disabled={
                    creatingOrder
                  }
                  className="dd-order-create__cancel"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    creatingOrder ||
                    customers.length ===
                      0 ||
                    inventory.length ===
                      0
                  }
                  className="dd-order-create__submit"
                >
                  {creatingOrder
                    ? "Creating..."
                    : `Create Order (${selectedOrderItems.length})`}
                </button>
              </div>
            </footer>
          </form>
        )}

        {loading && (
          <LoadingState message="Loading orders..." />
        )}

        {!loading && error && (
          <ErrorMessage
            title="Unable to load orders"
            message={error}
          />
        )}

        {!loading && !error && (
          <>
            <div className="dd-orders__metrics">
              <SummaryCard
                label="Total Orders"
                value={
                  orderCounts.total
                }
                description="All order records"
                accent="neutral"
              />

              <SummaryCard
                label="New"
                value={
                  orderCounts.new
                }
                description="Awaiting fulfillment"
                accent="orange"
              />

              <SummaryCard
                label="Preparing"
                value={
                  orderCounts.preparing
                }
                description="Currently in progress"
                accent="blue"
              />

              <SummaryCard
                label="Completed"
                value={
                  orderCounts.completed
                }
                description="Fulfilled orders"
                accent="neutral"
              />
            </div>

            <section className="dd-orders__controls">
              <div className="dd-orders__search">
                <label htmlFor="order-search">
                  Search Orders
                </label>

                <div>
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />

                    <path
                      d="m16 16 4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>

                  <input
                    id="order-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Business, product, or order ID"
                  />

                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() =>
                        setSearchTerm(
                          "",
                        )
                      }
                      aria-label="Clear order search"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div className="dd-orders__filters">
                <span>
                  Status
                </span>

                <div>
                  {STATUS_FILTERS.map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setStatusFilter(
                            status,
                          )
                        }
                        className={
                          statusFilter ===
                          status
                            ? "dd-orders__filter--active"
                            : ""
                        }
                      >
                        {status}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </section>

            <section className="dd-orders__queue">
              <header className="dd-orders__queue-header">
                <div>
                  <div className="dd-label">
                    Fulfillment Queue
                  </div>

                  <h2>
                    Distributor Orders
                  </h2>
                </div>

                <p>
                  Showing{" "}
                  <strong>
                    {
                      filteredOrders.length
                    }
                  </strong>{" "}
                  of{" "}
                  <strong>
                    {orders.length}
                  </strong>
                </p>
              </header>

              {filteredOrders.length ===
              0 ? (
                <div className="dd-orders__empty">
                  <div>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 7h14l-1 13H6L5 7Zm3 0V5a4 4 0 0 1 8 0v2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>

                  <strong>
                    No orders found
                  </strong>

                  <p>
                    Adjust your search
                    or status filter.
                  </p>
                </div>
              ) : (
                <div className="dd-orders__list">
                  {filteredOrders.map(
                    (order) => (
                      <OrderCard
                        key={
                          order.orderId
                        }
                        order={order}
                        selectedStatus={
                          selectedStatuses[
                            order
                              .orderId
                          ] ||
                          order.status
                        }
                        isExpanded={
                          expandedOrderId ===
                          order.orderId
                        }
                        isUpdating={
                          updatingOrderId ===
                          order.orderId
                        }
                        onToggle={() =>
                          setExpandedOrderId(
                            expandedOrderId ===
                              order.orderId
                              ? null
                              : order.orderId,
                          )
                        }
                        onStatusChange={(
                          status,
                        ) =>
                          setSelectedStatuses(
                            (
                              currentStatuses,
                            ) => ({
                              ...currentStatuses,
                              [order.orderId]:
                                status,
                            }),
                          )
                        }
                        onUpdateStatus={() =>
                          void handleUpdateOrderStatus(
                            order.orderId,
                          )
                        }
                        getTotalQuantity={
                          getTotalQuantity
                        }
                      />
                    ),
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </section>
  );
}

type OrderCardProps = {
  order: Order;
  selectedStatus: OrderStatus;
  isExpanded: boolean;
  isUpdating: boolean;
  onToggle: () => void;
  onStatusChange: (
    status: OrderStatus,
  ) => void;
  onUpdateStatus: () => void;
  getTotalQuantity: (
    order: Order,
  ) => number;
};

function OrderCard({
  order,
  selectedStatus,
  isExpanded,
  isUpdating,
  onToggle,
  onStatusChange,
  onUpdateStatus,
  getTotalQuantity,
}: OrderCardProps) {
  const allowedStatuses =
    STATUS_TRANSITIONS[
      order.status
    ];

  const statusHasChanged =
    selectedStatus !== order.status;

  const isFinal =
    allowedStatuses.length === 1;

  return (
    <article
      className={[
        "dd-order-card",
        isExpanded
          ? "dd-order-card--expanded"
          : "",
      ].join(" ")}
    >
      <div className="dd-order-card__summary">
        <div className="dd-order-card__identity">
          <div className="dd-order-card__marker" />

          <div>
            <strong>
              {order.businessName}
            </strong>

            <span title={order.orderId}>
              {order.orderId}
            </span>
          </div>
        </div>

        <OrderStat
          label="Products"
          value={order.items.length}
        />

        <OrderStat
          label="Cases"
          value={
            getTotalQuantity(order)
          }
        />

        <OrderStat
          label="Total"
          value={formatCurrency(
            order.total,
          )}
          emphasis
        />

        <div className="dd-order-card__state">
          <OrderStatusBadge
            status={order.status}
          />

          <span>
            {formatDate(
              order.createdAt,
              "dateTime",
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="dd-order-card__details-button"
          aria-expanded={isExpanded}
        >
          <span>
            {isExpanded
              ? "Hide"
              : "Details"}
          </span>

          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="m7 9 5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="dd-order-detail">
          <div className="dd-order-detail__main">
            <section>
              <div className="dd-order-detail__heading">
                <div>
                  <span>
                    Order Contents
                  </span>

                  <h3>
                    Line Items
                  </h3>
                </div>

                <strong>
                  {order.items.length}{" "}
                  Products ·{" "}
                  {getTotalQuantity(
                    order,
                  )}{" "}
                  Cases
                </strong>
              </div>

              <div className="dd-order-detail__items">
                {order.items.map(
                  (item) => (
                    <div
                      key={
                        item.productId
                      }
                      className="dd-order-detail__item"
                    >
                      <div>
                        <strong>
                          {
                            item.productName
                          }
                        </strong>

                        <span>
                          {item.productId}
                        </span>
                      </div>

                      <div className="dd-order-detail__item-pricing">
                        <span>
                          {item.quantity} ×{" "}
                          {formatCurrency(
                            item.unitPrice,
                          )}
                        </span>

                        <strong>
                          {formatCurrency(
                            item.lineTotal,
                          )}
                        </strong>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>

            <section className="dd-order-detail__notes">
              <span>
                Fulfillment Notes
              </span>

              <p>
                {order.notes?.trim()
                  ? order.notes
                  : "No notes were added to this order."}
              </p>
            </section>
          </div>

          <aside className="dd-order-detail__rail">
            <section className="dd-order-detail__totals">
              <div className="dd-order-detail__rail-title">
                Order Summary
              </div>

              <SummaryLine
                label="Subtotal"
                value={formatCurrency(
                  order.subtotal,
                )}
              />

              <SummaryLine
                label="Tax"
                value={formatCurrency(
                  order.tax,
                )}
              />

              <SummaryLine
                label="Discount"
                value={formatCurrency(
                  order.discount,
                )}
              />

              <div className="dd-order-detail__total">
                <span>
                  Total
                </span>

                <strong>
                  {formatCurrency(
                    order.total,
                  )}
                </strong>
              </div>

              <div className="dd-order-detail__payment">
                <span>
                  Payment
                </span>

                <strong>
                  {
                    order.paymentStatus
                  }
                </strong>
              </div>
            </section>

            <section className="dd-order-detail__status-control">
              <div className="dd-order-detail__rail-title">
                Fulfillment Status
              </div>

              <div className="dd-order-detail__current">
                <span>
                  Current
                </span>

                <OrderStatusBadge
                  status={
                    order.status
                  }
                />
              </div>

              <label
                htmlFor={`status-${order.orderId}`}
              >
                Next Status
              </label>

              <select
                id={`status-${order.orderId}`}
                value={
                  selectedStatus
                }
                onChange={(event) =>
                  onStatusChange(
                    event.target
                      .value as OrderStatus,
                  )
                }
                disabled={
                  isUpdating ||
                  isFinal
                }
              >
                {allowedStatuses.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ),
                )}
              </select>

              <button
                type="button"
                onClick={
                  onUpdateStatus
                }
                disabled={
                  !statusHasChanged ||
                  isUpdating ||
                  isFinal
                }
              >
                {isUpdating
                  ? "Saving..."
                  : "Update Status"}
              </button>

              {isFinal && (
                <p className="dd-order-detail__final">
                  Final status reached.
                  This order can no
                  longer be changed.
                </p>
              )}

              <div className="dd-order-detail__updated">
                <span>
                  Last Updated
                </span>

                <strong>
                  {formatDate(
                    order.updatedAt,
                    "dateTime",
                  )}
                </strong>
              </div>
            </section>
          </aside>
        </div>
      )}
    </article>
  );
}

function OrderStat({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string | number;
  emphasis?: boolean;
}) {
  return (
    <div className="dd-order-card__stat">
      <span>
        {label}
      </span>

      <strong
        className={
          emphasis
            ? "dd-order-card__stat--emphasis"
            : ""
        }
      >
        {value}
      </strong>
    </div>
  );
}

function OrderStatusBadge({
  status,
}: {
  status: OrderStatus;
}) {
  return (
    <span
      className={[
        "dd-order-status",
        `dd-order-status--${status
          .toLowerCase()
          .replace(/\s+/g, "-")}`,
      ].join(" ")}
    >
      <span />
      {status}
    </span>
  );
}

function SummaryLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="dd-order-detail__summary-line">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}
