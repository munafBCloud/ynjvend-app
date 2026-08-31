import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  createInvoice,
} from "../services/invoices";

import {
  getOrders,
} from "../services/orders";

import {
  formatCurrency,
  formatDate,
} from "../utils/formatters";

import type {
  Invoice,
} from "../types/invoice";

import type {
  Order,
} from "../types/order";

type InvoiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (
    invoice: Invoice,
  ) => void;
};

function getToday() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function getDefaultDueDate() {
  const dueDate = new Date();

  dueDate.setDate(
    dueDate.getDate() + 30,
  );

  return dueDate
    .toISOString()
    .slice(0, 10);
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

export default function InvoiceModal({
  isOpen,
  onClose,
  onCreated,
}: InvoiceModalProps) {
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [
    selectedOrderId,
    setSelectedOrderId,
  ] = useState("");

  const [
    issueDate,
    setIssueDate,
  ] = useState(getToday());

  const [
    dueDate,
    setDueDate,
  ] = useState(
    getDefaultDueDate(),
  );

  const [notes, setNotes] =
    useState("");

  const [
    loadingData,
    setLoadingData,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    async function loadFormData() {
      try {
        setLoadingData(true);
        setError("");

        const loadedOrders =
          await getOrders();

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

  const completedOrders =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            order.status ===
            "Completed",
        ),
      [orders],
    );

  const selectedOrder =
    useMemo(
      () =>
        completedOrders.find(
          (order) =>
            order.orderId ===
            selectedOrderId,
        ) ?? null,
      [
        completedOrders,
        selectedOrderId,
      ],
    );

  function resetForm() {
    setSelectedOrderId("");
    setIssueDate(getToday());

    setDueDate(
      getDefaultDueDate(),
    );

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
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedOrder) {
      setError(
        "Select a completed order.",
      );

      return;
    }

    if (
      !issueDate ||
      !dueDate
    ) {
      setError(
        "Issue date and due date are required.",
      );

      return;
    }

    if (
      new Date(
        dueDate,
      ).getTime() <
      new Date(
        issueDate,
      ).getTime()
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
          orderId:
            selectedOrder.orderId,
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
    <div className="dd-invoice-modal">
      <button
        type="button"
        className="dd-invoice-modal__backdrop"
        onClick={handleClose}
        disabled={submitting}
        aria-label="Close create invoice dialog"
      />

      <div
        className="dd-invoice-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-invoice-title"
      >
        <header className="dd-invoice-modal__header">
          <div>
            <div className="dd-invoice-modal__eyebrow">
              <span />
              Billing Operations
            </div>

            <h2 id="create-invoice-title">
              Create Invoice
            </h2>

            <p>
              Generate a customer
              invoice from a completed
              distributor order.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="dd-invoice-modal__close"
            aria-label="Close invoice form"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M7 7l10 10M17 7 7 17"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        {loadingData ? (
          <div className="dd-invoice-modal__loading">
            <span className="dd-invoice-modal__spinner" />

            Loading completed
            orders...
          </div>
        ) : (
          <form
            onSubmit={
              handleSubmit
            }
            className="dd-invoice-modal__form"
          >
            {error && (
              <div
                className="dd-invoice-modal__error"
                role="alert"
              >
                <span>!</span>

                <div>
                  <strong>
                    Invoice could
                    not be created
                  </strong>

                  <p>
                    {error}
                  </p>
                </div>
              </div>
            )}

            <section className="dd-invoice-modal__section">
              <div className="dd-invoice-modal__section-label">
                <span>01</span>

                <div>
                  <strong>
                    Completed Order
                  </strong>

                  <p>
                    Select the order
                    being billed.
                  </p>
                </div>
              </div>

              <div className="dd-invoice-modal__content">
                <label htmlFor="invoice-order">
                  Completed Order
                </label>

                <select
                  id="invoice-order"
                  value={
                    selectedOrderId
                  }
                  onChange={(event) =>
                    setSelectedOrderId(
                      event.target
                        .value,
                    )
                  }
                  disabled={
                    submitting ||
                    completedOrders.length ===
                      0
                  }
                >
                  <option value="">
                    Select a completed
                    order
                  </option>

                  {completedOrders.map(
                    (order) => (
                      <option
                        key={
                          order.orderId
                        }
                        value={
                          order.orderId
                        }
                      >
                        {
                          order.businessName
                        }{" "}
                        —{" "}
                        {formatCurrency(
                          order.total,
                        )}
                      </option>
                    ),
                  )}
                </select>

                {completedOrders.length ===
                  0 && (
                  <p className="dd-invoice-modal__warning">
                    No completed
                    orders are
                    available for
                    invoicing.
                  </p>
                )}
              </div>
            </section>

            {selectedOrder && (
              <section className="dd-invoice-modal__order">
                <header className="dd-invoice-modal__order-header">
                  <div>
                    <span>
                      Customer
                    </span>

                    <strong>
                      {
                        selectedOrder.businessName
                      }
                    </strong>

                    <small>
                      {
                        selectedOrder.orderId
                      }
                    </small>
                  </div>

                  <div>
                    <span>
                      Order Total
                    </span>

                    <strong>
                      {formatCurrency(
                        selectedOrder.total,
                      )}
                    </strong>

                    <small>
                      Completed{" "}
                      {formatDate(
                        selectedOrder.updatedAt,
                      )}
                    </small>
                  </div>
                </header>

                <div className="dd-invoice-modal__order-stats">
                  <ModalStat
                    label="Products"
                    value={
                      selectedOrder.items
                        .length
                    }
                  />

                  <ModalStat
                    label="Cases"
                    value={getTotalQuantity(
                      selectedOrder,
                    )}
                  />

                  <ModalStat
                    label="Payment"
                    value={
                      selectedOrder.paymentStatus
                    }
                  />
                </div>

                <div className="dd-invoice-modal__items">
                  {selectedOrder.items.map(
                    (item) => (
                      <div
                        key={
                          item.productId
                        }
                      >
                        <div>
                          <strong>
                            {
                              item.productName
                            }
                          </strong>

                          <span>
                            {
                              item.quantity
                            }{" "}
                            ×{" "}
                            {formatCurrency(
                              item.unitPrice,
                            )}
                          </span>
                        </div>

                        <strong>
                          {formatCurrency(
                            item.lineTotal,
                          )}
                        </strong>
                      </div>
                    ),
                  )}
                </div>

                <div className="dd-invoice-modal__order-total">
                  <ModalTotalLine
                    label="Subtotal"
                    value={formatCurrency(
                      selectedOrder.subtotal,
                    )}
                  />

                  <ModalTotalLine
                    label="Tax"
                    value={formatCurrency(
                      selectedOrder.tax,
                    )}
                  />

                  <ModalTotalLine
                    label="Discount"
                    value={formatCurrency(
                      selectedOrder.discount,
                    )}
                  />

                  <div>
                    <span>
                      Total
                    </span>

                    <strong>
                      {formatCurrency(
                        selectedOrder.total,
                      )}
                    </strong>
                  </div>
                </div>
              </section>
            )}

            <section className="dd-invoice-modal__section">
              <div className="dd-invoice-modal__section-label">
                <span>02</span>

                <div>
                  <strong>
                    Billing Dates
                  </strong>

                  <p>
                    Define issue and
                    payment due dates.
                  </p>
                </div>
              </div>

              <div className="dd-invoice-modal__date-grid">
                <div>
                  <label htmlFor="invoice-issue-date">
                    Issue Date
                  </label>

                  <input
                    id="invoice-issue-date"
                    type="date"
                    value={issueDate}
                    onChange={(event) =>
                      setIssueDate(
                        event.target
                          .value,
                      )
                    }
                    disabled={
                      submitting
                    }
                  />
                </div>

                <div>
                  <label htmlFor="invoice-due-date">
                    Due Date
                  </label>

                  <input
                    id="invoice-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(event) =>
                      setDueDate(
                        event.target
                          .value,
                      )
                    }
                    disabled={
                      submitting
                    }
                  />
                </div>
              </div>
            </section>

            <section className="dd-invoice-modal__section">
              <div className="dd-invoice-modal__section-label">
                <span>03</span>

                <div>
                  <strong>
                    Notes
                  </strong>

                  <p>
                    Optional billing
                    terms or information.
                  </p>
                </div>
              </div>

              <div className="dd-invoice-modal__content">
                <label htmlFor="invoice-notes">
                  Invoice Notes
                </label>

                <textarea
                  id="invoice-notes"
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target
                        .value,
                    )
                  }
                  disabled={
                    submitting
                  }
                  rows={4}
                  maxLength={2000}
                  placeholder="Payment terms or additional information"
                />
              </div>
            </section>

            <footer className="dd-invoice-modal__footer">
              <div>
                <span />
                Invoice from completed
                order
              </div>

              <div className="dd-invoice-modal__actions">
                <button
                  type="button"
                  onClick={
                    handleClose
                  }
                  disabled={
                    submitting
                  }
                  className="dd-invoice-modal__cancel"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !selectedOrder ||
                    completedOrders.length ===
                      0
                  }
                  className="dd-invoice-modal__submit"
                >
                  {submitting ? (
                    <>
                      <span className="dd-invoice-modal__spinner" />
                      Creating
                    </>
                  ) : (
                    <>
                      <span>+</span>
                      Create Invoice
                    </>
                  )}
                </button>
              </div>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}

function ModalStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function ModalTotalLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}
