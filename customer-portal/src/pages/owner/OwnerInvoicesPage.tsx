import {
  useEffect,
  useMemo,
  useState,
} from "react";

import ErrorMessage from "../../components/ErrorMessage";
import InvoiceModal from "../../components/InvoiceModal";
import LoadingState from "../../components/LoadingState";
import SummaryCard from "../../components/SummaryCard";

import {
  getInvoices,
  updateInvoice,
} from "../../services/invoices";

import {
  formatCurrency,
  formatDate,
} from "../../utils/formatters";

import type {
  Invoice,
  InvoiceStatus,
} from "../../types/invoice";

const STATUS_FILTERS = [
  "All",
  "Draft",
  "Sent",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Void",
] as const;

type InvoiceUpdateInput = {
  status?: InvoiceStatus;
  amountPaid?: number;
  notes?: string;
  dueDate?: string;
};

export default function OwnerInvoicesPage() {
  const [invoices, setInvoices] =
    useState<Invoice[]>([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [
    expandedInvoiceId,
    setExpandedInvoiceId,
  ] = useState<string | null>(null);

  const [
    showCreateInvoice,
    setShowCreateInvoice,
  ] = useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    updatingInvoiceId,
    setUpdatingInvoiceId,
  ] = useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [actionError, setActionError] =
    useState("");

  useEffect(() => {
    async function loadInvoices() {
      try {
        setLoading(true);
        setError("");

        const loadedInvoices =
          await getInvoices();

        setInvoices(loadedInvoices);
      } catch (loadError) {
        console.error(
          "Unable to load invoices:",
          loadError,
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load invoices.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadInvoices();
  }, []);

  const filteredInvoices = useMemo(
    () => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return invoices.filter(
        (invoice) => {
          const matchesStatus =
            statusFilter === "All" ||
            invoice.status ===
              statusFilter;

          const matchesSearch =
            normalizedSearch.length ===
              0 ||
            invoice.invoiceNumber
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            invoice.businessName
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            invoice.customerId
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            invoice.orderId
              .toLowerCase()
              .includes(
                normalizedSearch,
              );

          return (
            matchesStatus &&
            matchesSearch
          );
        },
      );
    },
    [
      invoices,
      searchTerm,
      statusFilter,
    ],
  );

  const invoiceCounts = useMemo(
    () => ({
      total: invoices.length,

      outstanding:
        invoices.filter(
          (invoice) =>
            invoice.status !==
              "Paid" &&
            invoice.status !==
              "Void" &&
            invoice.balanceDue > 0,
        ).length,

      paid: invoices.filter(
        (invoice) =>
          invoice.status === "Paid",
      ).length,

      overdue: invoices.filter(
        (invoice) =>
          invoice.status ===
          "Overdue",
      ).length,
    }),
    [invoices],
  );

  const outstandingBalance = useMemo(
    () =>
      invoices
        .filter(
          (invoice) =>
            invoice.status !==
              "Void" &&
            invoice.balanceDue > 0,
        )
        .reduce(
          (total, invoice) =>
            total +
            Number(
              invoice.balanceDue ||
                0,
            ),
          0,
        ),
    [invoices],
  );

  async function handleInvoiceUpdate(
    invoiceId: string,
    update: InvoiceUpdateInput,
    successText: string,
  ) {
    try {
      setUpdatingInvoiceId(
        invoiceId,
      );

      setActionError("");
      setSuccessMessage("");

      const updatedInvoice =
        await updateInvoice(
          invoiceId,
          update,
        );

      setInvoices(
        (currentInvoices) =>
          currentInvoices.map(
            (invoice) =>
              invoice.invoiceId ===
              invoiceId
                ? updatedInvoice
                : invoice,
          ),
      );

      setSuccessMessage(
        successText,
      );
    } catch (updateError) {
      console.error(
        "Unable to update invoice:",
        updateError,
      );

      setActionError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update invoice.",
      );
    } finally {
      setUpdatingInvoiceId(
        null,
      );
    }
  }

  return (
    <section className="dd-invoices">
      <div className="dd-invoices__inner">
        <header className="dd-invoices__header">
          <div>
            <div className="dd-invoices__eyebrow">
              <span />
              Billing Operations
            </div>

            <h1>
              Invoice Management
            </h1>

            <p>
              Track customer billing,
              balances, payment status,
              and invoice lifecycle.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSuccessMessage("");
              setActionError("");
              setShowCreateInvoice(
                true,
              );
            }}
            className="dd-invoices__create"
          >
            <span>+</span>
            Create Invoice
          </button>
        </header>

        {successMessage && (
          <div className="dd-invoices__success">
            <span />
            {successMessage}
          </div>
        )}

        {actionError && (
          <div className="dd-invoices__action-error">
            <strong>
              Invoice action failed
            </strong>

            <p>
              {actionError}
            </p>
          </div>
        )}

        {loading && (
          <LoadingState message="Loading invoices..." />
        )}

        {!loading && error && (
          <ErrorMessage
            title="Unable to load invoices"
            message={error}
          />
        )}

        {!loading && !error && (
          <>
            <div className="dd-invoices__metrics">
              <SummaryCard
                label="Invoices"
                value={
                  invoiceCounts.total
                }
                description="All invoice records"
                accent="neutral"
              />

              <SummaryCard
                label="Outstanding"
                value={
                  invoiceCounts.outstanding
                }
                description="Open balances"
                accent="orange"
              />

              <SummaryCard
                label="Paid"
                value={
                  invoiceCounts.paid
                }
                description="Settled invoices"
                accent="blue"
              />

              <SummaryCard
                label="Overdue"
                value={
                  invoiceCounts.overdue
                }
                description="Requires attention"
                accent={
                  invoiceCounts.overdue >
                  0
                    ? "orange"
                    : "neutral"
                }
              />
            </div>

            <section className="dd-invoices__balance-strip">
              <div>
                <span>
                  Outstanding A/R
                </span>

                <strong>
                  {formatCurrency(
                    outstandingBalance,
                  )}
                </strong>
              </div>

              <p>
                Remaining balance
                across all non-void
                invoices.
              </p>
            </section>

            <section className="dd-invoices__controls">
              <div className="dd-invoices__search">
                <label htmlFor="invoice-search">
                  Search Invoices
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
                    id="invoice-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Invoice number, customer, or order ID"
                  />

                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() =>
                        setSearchTerm(
                          "",
                        )
                      }
                      aria-label="Clear invoice search"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div className="dd-invoices__status-filter">
                <label htmlFor="invoice-status-filter">
                  Status
                </label>

                <select
                  id="invoice-status-filter"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target
                        .value,
                    )
                  }
                >
                  {STATUS_FILTERS.map(
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
              </div>
            </section>

            <section className="dd-invoices__ledger">
              <header className="dd-invoices__ledger-header">
                <div>
                  <div className="dd-label">
                    Billing Ledger
                  </div>

                  <h2>
                    Customer Invoices
                  </h2>
                </div>

                <p>
                  Showing{" "}
                  <strong>
                    {
                      filteredInvoices.length
                    }
                  </strong>{" "}
                  of{" "}
                  <strong>
                    {invoices.length}
                  </strong>
                </p>
              </header>

              {filteredInvoices.length ===
              0 ? (
                <div className="dd-invoices__empty">
                  <div>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M7 3h10v18l-2-1.5L13 21l-2-1.5L9 21l-2-1.5V3Zm3 5h4m-4 4h4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  <strong>
                    No invoices found
                  </strong>

                  <p>
                    Adjust the current
                    search or status
                    filter.
                  </p>
                </div>
              ) : (
                <div className="dd-invoices__list">
                  {filteredInvoices.map(
                    (invoice) => (
                      <InvoiceCard
                        key={
                          invoice.invoiceId
                        }
                        invoice={
                          invoice
                        }
                        expanded={
                          expandedInvoiceId ===
                          invoice.invoiceId
                        }
                        updating={
                          updatingInvoiceId ===
                          invoice.invoiceId
                        }
                        onToggle={() =>
                          setExpandedInvoiceId(
                            expandedInvoiceId ===
                              invoice.invoiceId
                              ? null
                              : invoice.invoiceId,
                          )
                        }
                        onUpdate={(
                          update,
                          successText,
                        ) =>
                          void handleInvoiceUpdate(
                            invoice.invoiceId,
                            update,
                            successText,
                          )
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

      <InvoiceModal
        isOpen={showCreateInvoice}
        onClose={() =>
          setShowCreateInvoice(
            false,
          )
        }
        onCreated={(invoice) => {
          setInvoices(
            (currentInvoices) => [
              invoice,
              ...currentInvoices,
            ],
          );

          setExpandedInvoiceId(
            invoice.invoiceId,
          );

          setSuccessMessage(
            `${invoice.invoiceNumber} was created successfully.`,
          );
        }}
      />
    </section>
  );
}

type InvoiceCardProps = {
  invoice: Invoice;
  expanded: boolean;
  updating: boolean;
  onToggle: () => void;
  onUpdate: (
    update: InvoiceUpdateInput,
    successText: string,
  ) => void;
};

function InvoiceCard({
  invoice,
  expanded,
  updating,
  onToggle,
  onUpdate,
}: InvoiceCardProps) {
  return (
    <article
      className={[
        "dd-invoice-card",
        expanded
          ? "dd-invoice-card--expanded"
          : "",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onToggle}
        className="dd-invoice-card__summary"
        aria-expanded={expanded}
      >
        <div className="dd-invoice-card__identity">
          <div className="dd-invoice-card__marker" />

          <div>
            <strong>
              {invoice.invoiceNumber}
            </strong>

            <span>
              {invoice.invoiceId}
            </span>
          </div>
        </div>

        <div className="dd-invoice-card__customer">
          <span>
            Customer
          </span>

          <strong>
            {invoice.businessName}
          </strong>

          <small>
            Due{" "}
            {formatDate(
              invoice.dueDate,
            )}
          </small>
        </div>

        <InvoiceStat
          label="Total"
          value={formatCurrency(
            invoice.total,
          )}
        />

        <InvoiceStat
          label="Balance Due"
          value={formatCurrency(
            invoice.balanceDue,
          )}
          attention={
            invoice.balanceDue > 0 &&
            invoice.status !== "Void"
          }
        />

        <div className="dd-invoice-card__status">
          <InvoiceStatusBadge
            status={invoice.status}
          />
        </div>

        <svg
          className="dd-invoice-card__chevron"
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

      {expanded && (
        <div className="dd-invoice-detail">
          <div className="dd-invoice-detail__main">
            <section className="dd-invoice-detail__metadata">
              <MetaItem
                label="Issue Date"
                value={formatDate(
                  invoice.issueDate,
                )}
              />

              <MetaItem
                label="Due Date"
                value={formatDate(
                  invoice.dueDate,
                )}
              />

              <MetaItem
                label="Order ID"
                value={
                  invoice.orderId ||
                  "Not linked"
                }
                mono
              />

              <MetaItem
                label="Customer ID"
                value={
                  invoice.customerId
                }
                mono
              />
            </section>

            <section className="dd-invoice-detail__items-section">
              <div className="dd-invoice-detail__heading">
                <div>
                  <span>
                    Invoice Contents
                  </span>

                  <h3>
                    Line Items
                  </h3>
                </div>

                <strong>
                  {invoice.items.length}{" "}
                  products
                </strong>
              </div>

              <div className="dd-invoice-detail__items">
                <div className="dd-invoice-detail__items-head">
                  <span>
                    Product
                  </span>

                  <span>
                    Qty
                  </span>

                  <span>
                    Unit Price
                  </span>

                  <span>
                    Line Total
                  </span>
                </div>

                {invoice.items.map(
                  (item) => (
                    <div
                      key={`${invoice.invoiceId}-${item.productId}`}
                      className="dd-invoice-detail__item"
                    >
                      <div>
                        <strong>
                          {
                            item.productName
                          }
                        </strong>

                        <small>
                          {
                            item.productId
                          }
                        </small>
                      </div>

                      <span>
                        {item.quantity}
                      </span>

                      <span>
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
                  ),
                )}
              </div>
            </section>

            {invoice.notes && (
              <section className="dd-invoice-detail__notes">
                <span>
                  Billing Notes
                </span>

                <p>
                  {invoice.notes}
                </p>
              </section>
            )}
          </div>

          <aside className="dd-invoice-detail__rail">
            <section className="dd-invoice-detail__financials">
              <h3>
                Invoice Summary
              </h3>

              <FinancialLine
                label="Subtotal"
                value={formatCurrency(
                  invoice.subtotal,
                )}
              />

              <FinancialLine
                label="Tax"
                value={formatCurrency(
                  invoice.tax,
                )}
              />

              <FinancialLine
                label="Discount"
                value={formatCurrency(
                  invoice.discount,
                )}
              />

              <FinancialLine
                label="Amount Paid"
                value={formatCurrency(
                  invoice.amountPaid,
                )}
              />

              <div className="dd-invoice-detail__balance">
                <span>
                  Balance Due
                </span>

                <strong>
                  {formatCurrency(
                    invoice.balanceDue,
                  )}
                </strong>
              </div>

              <div className="dd-invoice-detail__total">
                <span>
                  Invoice Total
                </span>

                <strong>
                  {formatCurrency(
                    invoice.total,
                  )}
                </strong>
              </div>
            </section>

            <section className="dd-invoice-detail__actions">
              <div className="dd-invoice-detail__actions-header">
                <span>
                  Billing Status
                </span>

                <InvoiceStatusBadge
                  status={
                    invoice.status
                  }
                />
              </div>

              <div className="dd-invoice-detail__action-grid">
                {invoice.status ===
                  "Draft" && (
                  <button
                    type="button"
                    disabled={
                      updating
                    }
                    onClick={() =>
                      onUpdate(
                        {
                          status:
                            "Sent",
                        },
                        `${invoice.invoiceNumber} was marked as sent.`,
                      )
                    }
                    className="dd-invoice-action dd-invoice-action--send"
                  >
                    Mark Sent
                  </button>
                )}

                {invoice.status !==
                  "Paid" &&
                  invoice.status !==
                    "Void" && (
                    <button
                      type="button"
                      disabled={
                        updating
                      }
                      onClick={() =>
                        onUpdate(
                          {
                            amountPaid:
                              invoice.total,
                          },
                          `${invoice.invoiceNumber} was marked as paid.`,
                        )
                      }
                      className="dd-invoice-action dd-invoice-action--paid"
                    >
                      Mark Paid
                    </button>
                  )}

                {invoice.status !==
                  "Paid" &&
                  invoice.status !==
                    "Overdue" &&
                  invoice.status !==
                    "Void" && (
                    <button
                      type="button"
                      disabled={
                        updating
                      }
                      onClick={() =>
                        onUpdate(
                          {
                            status:
                              "Overdue",
                          },
                          `${invoice.invoiceNumber} was marked as overdue.`,
                        )
                      }
                      className="dd-invoice-action dd-invoice-action--overdue"
                    >
                      Mark Overdue
                    </button>
                  )}

                {invoice.status !==
                  "Void" && (
                  <button
                    type="button"
                    disabled={
                      updating
                    }
                    onClick={() => {
                      const confirmed =
                        window.confirm(
                          `Void ${invoice.invoiceNumber}? This preserves the invoice but marks it as void.`,
                        );

                      if (
                        !confirmed
                      ) {
                        return;
                      }

                      onUpdate(
                        {
                          status:
                            "Void",
                        },
                        `${invoice.invoiceNumber} was voided.`,
                      );
                    }}
                    className="dd-invoice-action dd-invoice-action--void"
                  >
                    Void Invoice
                  </button>
                )}
              </div>

              {updating && (
                <p className="dd-invoice-detail__updating">
                  Updating invoice...
                </p>
              )}

              <div className="dd-invoice-detail__updated">
                <span>
                  Last Updated
                </span>

                <strong>
                  {formatDate(
                    invoice.updatedAt,
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

function InvoiceStat({
  label,
  value,
  attention = false,
}: {
  label: string;
  value: string;
  attention?: boolean;
}) {
  return (
    <div className="dd-invoice-card__stat">
      <span>
        {label}
      </span>

      <strong
        className={
          attention
            ? "dd-invoice-card__stat--attention"
            : ""
        }
      >
        {value}
      </strong>
    </div>
  );
}

function MetaItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="dd-invoice-detail__meta">
      <span>
        {label}
      </span>

      <strong
        className={
          mono
            ? "dd-invoice-detail__mono"
            : ""
        }
      >
        {value}
      </strong>
    </div>
  );
}

function FinancialLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="dd-invoice-detail__financial-line">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function InvoiceStatusBadge({
  status,
}: {
  status: InvoiceStatus;
}) {
  return (
    <span
      className={[
        "dd-invoice-status",
        `dd-invoice-status--${status
          .toLowerCase()
          .replace(/\s+/g, "-")}`,
      ].join(" ")}
    >
      <span />
      {status}
    </span>
  );
}
