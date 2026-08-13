import { useEffect, useMemo, useState } from "react";

import { createInvoice } from "../services/invoices";
import { getOrders } from "../services/orders";

import {
  formatCurrency,
  formatDate,
} from "../utils/formatters";

import type { Invoice } from "../types/invoice";
import type { Order } from "../types/order";

type InvoiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultDueDate() {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  return dueDate.toISOString().slice(0, 10);
}

function getTotalQuantity(order: Order) {
  return order.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );
}

export default function InvoiceModal({
  isOpen,
  onClose,
  onCreated,
}: InvoiceModalProps) {
  const [orders, setOrders] = useState<Order[]>([]);

  const [selectedOrderId, setSelectedOrderId] =
    useState("");

  const [issueDate, setIssueDate] =
    useState(getToday());

  const [dueDate, setDueDate] =
    useState(getDefaultDueDate());

  const [notes, setNotes] = useState("");

  const [loadingData, setLoadingData] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    async function loadFormData() {
      try {
        setLoadingData(true);
        setError("");

        const loadedOrders = await getOrders();

        setOrders(loadedOrders);
      } catch (loadError) {
        console.error(
          "Unable to load invoice form data:",
          loadError,
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load completed orders.",
        );
      } finally {
        setLoadingData(false);
      }
    }

    void loadFormData();
  }, [isOpen]);

  const completedOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status === "Completed",
      ),
    [orders],
  );

  const selectedOrder = useMemo(
    () =>
      completedOrders.find(
        (order) =>
          order.orderId === selectedOrderId,
      ) ?? null,
    [completedOrders, selectedOrderId],
  );

  function resetForm() {
    setSelectedOrderId("");
    setIssueDate(getToday());
    setDueDate(getDefaultDueDate());
    setNotes("");
    setError("");
  }

  function handleClose() {
    if (submitting) {
      return;
    }

    resetForm();
    onClose();
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedOrder) {
      setError(
        "Select a completed order.",
      );
      return;
    }

    if (!issueDate || !dueDate) {
      setError(
        "Issue date and due date are required.",
      );
      return;
    }

    if (
      new Date(dueDate).getTime() <
      new Date(issueDate).getTime()
    ) {
      setError(
        "Due date cannot be before the issue date.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const createdInvoice =
        await createInvoice({
          orderId: selectedOrder.orderId,
          issueDate,
          dueDate,
          notes: notes.trim(),
        });

      onCreated(createdInvoice);

      resetForm();
      onClose();
    } catch (createError) {
      console.error(
        "Unable to create invoice:",
        createError,
      );

      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create invoice.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-8">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
              Billing
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              Create Invoice
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Create an invoice from a completed order.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            Close
          </button>
        </div>

        {loadingData ? (
          <div className="p-6">
            <p className="text-slate-600">
              Loading completed orders...
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-6"
          >
            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="font-semibold text-red-800">
                  {error}
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="invoice-order"
                className="block text-sm font-semibold text-slate-700"
              >
                Completed Order
              </label>

              <select
                id="invoice-order"
                value={selectedOrderId}
                onChange={(event) =>
                  setSelectedOrderId(
                    event.target.value,
                  )
                }
                disabled={
                  submitting ||
                  completedOrders.length === 0
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100"
              >
                <option value="">
                  Select a completed order
                </option>

                {completedOrders.map((order) => (
                  <option
                    key={order.orderId}
                    value={order.orderId}
                  >
                    {order.businessName} —{" "}
                    {formatCurrency(order.total)}
                  </option>
                ))}
              </select>

              {completedOrders.length === 0 && (
                <p className="mt-2 text-sm text-amber-700">
                  No completed orders are available
                  for invoicing.
                </p>
              )}
            </div>

            {selectedOrder && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Customer
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-950">
                      {selectedOrder.businessName}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {selectedOrder.orderId}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Order Total
                    </p>

                    <p className="mt-1 text-2xl font-bold text-slate-950">
                      {formatCurrency(
                        selectedOrder.total,
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Completed{" "}
                      {formatDate(
                        selectedOrder.updatedAt,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Products
                    </p>

                    <p className="mt-1 font-bold text-slate-950">
                      {selectedOrder.items.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Cases
                    </p>

                    <p className="mt-1 font-bold text-slate-950">
                      {getTotalQuantity(
                        selectedOrder,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Payment Status
                    </p>

                    <p className="mt-1 font-bold text-slate-950">
                      {
                        selectedOrder.paymentStatus
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="divide-y divide-slate-200">
                    {selectedOrder.items.map(
                      (item) => (
                        <div
                          key={item.productId}
                          className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-semibold text-slate-950">
                              {item.productName}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {item.quantity} ×{" "}
                              {formatCurrency(
                                item.unitPrice,
                              )}
                            </p>
                          </div>

                          <p className="font-bold text-slate-950">
                            {formatCurrency(
                              item.lineTotal,
                            )}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">
                      Subtotal
                    </span>

                    <span className="font-semibold text-slate-950">
                      {formatCurrency(
                        selectedOrder.subtotal,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">
                      Tax
                    </span>

                    <span className="font-semibold text-slate-950">
                      {formatCurrency(
                        selectedOrder.tax,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">
                      Discount
                    </span>

                    <span className="font-semibold text-slate-950">
                      {formatCurrency(
                        selectedOrder.discount,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-lg">
                    <span className="font-bold text-slate-950">
                      Total
                    </span>

                    <span className="font-bold text-slate-950">
                      {formatCurrency(
                        selectedOrder.total,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="invoice-issue-date"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Issue date
                </label>

                <input
                  id="invoice-issue-date"
                  type="date"
                  value={issueDate}
                  onChange={(event) =>
                    setIssueDate(
                      event.target.value,
                    )
                  }
                  disabled={submitting}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div>
                <label
                  htmlFor="invoice-due-date"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Due date
                </label>

                <input
                  id="invoice-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) =>
                    setDueDate(
                      event.target.value,
                    )
                  }
                  disabled={submitting}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
                />
              </div>
            </div>

            <div className="mt-7">
              <label
                htmlFor="invoice-notes"
                className="block text-sm font-semibold text-slate-700"
              >
                Notes
              </label>

              <textarea
                id="invoice-notes"
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                disabled={submitting}
                rows={5}
                maxLength={2000}
                placeholder="Payment terms or additional information"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  !selectedOrder ||
                  completedOrders.length === 0
                }
                className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Creating Invoice..."
                  : "Create Invoice"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
