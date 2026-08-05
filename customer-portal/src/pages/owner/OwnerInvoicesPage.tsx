import { useEffect, useMemo, useState } from "react";

import InvoiceModal from "../../components/InvoiceModal";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import SummaryCard from "../../components/SummaryCard";

import {
  formatCurrency,
  formatDate,
} from "../../utils/formatters";
import { getInvoiceStatusClasses } from "../../utils/status";
import {
  getInvoices,
  updateInvoice,
} from "../../services/invoices";

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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(
    null,
  );

  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInvoices() {
      try {
        setLoading(true);
        setError("");

        const loadedInvoices = await getInvoices();

        setInvoices(loadedInvoices);
      } catch (loadError) {
        console.error("Unable to load invoices:", loadError);

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

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesStatus =
        statusFilter === "All" || invoice.status === statusFilter;

      const matchesSearch =
        normalizedSearch.length === 0 ||
        invoice.invoiceNumber.toLowerCase().includes(normalizedSearch) ||
        invoice.businessName.toLowerCase().includes(normalizedSearch) ||
        invoice.customerId.toLowerCase().includes(normalizedSearch) ||
        invoice.orderId.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [invoices, searchTerm, statusFilter]);

  const invoiceCounts = useMemo(
    () => ({
      total: invoices.length,

      outstanding: invoices.filter(
        (invoice) =>
          invoice.status !== "Paid" &&
          invoice.status !== "Void" &&
          invoice.balanceDue > 0,
      ).length,

      paid: invoices.filter((invoice) => invoice.status === "Paid").length,

      overdue: invoices.filter((invoice) => invoice.status === "Overdue")
        .length,
    }),
    [invoices],
  );


  async function handleInvoiceUpdate(
    invoiceId: string,
    update: InvoiceUpdateInput,
    successText: string,
  ) {
    try {
      setUpdatingInvoiceId(invoiceId);
      setError("");
      setSuccessMessage("");

      const updatedInvoice = await updateInvoice(
        invoiceId,
        update,
      );

      setInvoices((currentInvoices) =>
        currentInvoices.map((invoice) =>
          invoice.invoiceId === invoiceId
            ? updatedInvoice
            : invoice,
        ),
      );

      setSuccessMessage(successText);
    } catch (updateError) {
      console.error("Unable to update invoice:", updateError);

      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update invoice.",
      );
    } finally {
      setUpdatingInvoiceId(null);
    }
  }


  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
              Billing
            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-950">
              Invoice Management
            </h2>

            <p className="mt-3 text-slate-600">
              Review invoices, balances, payment status, and billing details.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSuccessMessage("");
              setError("");
              setShowCreateInvoice(true);
            }}
            className="w-fit rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            Create Invoice
          </button>
        </div>

        {successMessage && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-800">
              {successMessage}
            </p>
          </div>
        )}

        {loading && (
          <LoadingState message="Loading invoices..." />
        )}

        {!loading && error && (
          <ErrorMessage
            title="Unable to complete invoice action"
            message={error}
          />
        )}

        {!loading && (
          <>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total Invoices"
                value={invoiceCounts.total}
              />

              <SummaryCard
                label="Outstanding"
                value={invoiceCounts.outstanding}
              />

              <SummaryCard
                label="Paid"
                value={invoiceCounts.paid}
              />

              <SummaryCard
                label="Overdue"
                value={invoiceCounts.overdue}
              />
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <div>
                  <label
                    htmlFor="invoice-search"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Search invoices
                  </label>

                  <input
                    id="invoice-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.target.value)
                    }
                    placeholder="Invoice number, customer, or order ID"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="invoice-status-filter"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Status
                  </label>

                  <select
                    id="invoice-status-filter"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
                  >
                    {STATUS_FILTERS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {filteredInvoices.length === 0 ? (
                <div className="p-6">
                  <p className="text-slate-600">
                    No invoices match the current search and filter.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {filteredInvoices.map((invoice) => {
                    const isExpanded =
                      expandedInvoiceId === invoice.invoiceId;

                    const isUpdating =
                      updatingInvoiceId === invoice.invoiceId;

                    return (
                      <article key={invoice.invoiceId}>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedInvoiceId(
                              isExpanded
                                ? null
                                : invoice.invoiceId,
                            )
                          }
                          className="grid w-full gap-4 px-6 py-5 text-left transition hover:bg-slate-50 md:grid-cols-[1.1fr_1.5fr_1fr_1fr_auto] md:items-center"
                        >
                          <div>
                            <p className="font-bold text-slate-950">
                              {invoice.invoiceNumber}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {invoice.invoiceId}
                            </p>
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">
                              {invoice.businessName}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              Due {formatDate(invoice.dueDate)}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-slate-500">
                              Total
                            </p>

                            <p className="mt-1 font-bold text-slate-950">
                              {formatCurrency(invoice.total)}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-slate-500">
                              Balance
                            </p>

                            <p className="mt-1 font-bold text-slate-950">
                              {formatCurrency(invoice.balanceDue)}
                            </p>
                          </div>

                          <span
                            className={[
                              "w-fit rounded-full px-3 py-1 text-xs font-semibold",
                              getInvoiceStatusClasses(invoice.status),
                            ].join(" ")}
                          >
                            {invoice.status}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-slate-200 bg-slate-50 px-6 py-6">
                            <div className="grid gap-6 md:grid-cols-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-500">
                                  Issue date
                                </p>

                                <p className="mt-1 text-slate-950">
                                  {formatDate(invoice.issueDate)}
                                </p>
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-slate-500">
                                  Due date
                                </p>

                                <p className="mt-1 text-slate-950">
                                  {formatDate(invoice.dueDate)}
                                </p>
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-slate-500">
                                  Order ID
                                </p>

                                <p className="mt-1 break-all text-slate-950">
                                  {invoice.orderId || "Not linked"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                              <div className="min-w-[650px]">
                                <div className="grid grid-cols-[1fr_90px_120px_120px] gap-4 border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">
                                  <span>Product</span>
                                  <span>Qty</span>
                                  <span>Unit price</span>
                                  <span>Line total</span>
                                </div>

                                {invoice.items.map((item) => (
                                  <div
                                    key={`${invoice.invoiceId}-${item.productId}`}
                                    className="grid grid-cols-[1fr_90px_120px_120px] gap-4 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
                                  >
                                    <span className="font-medium text-slate-900">
                                      {item.productName}
                                    </span>

                                    <span>{item.quantity}</span>

                                    <span>
                                      {formatCurrency(item.unitPrice)}
                                    </span>

                                    <span className="font-semibold">
                                      {formatCurrency(item.lineTotal)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="mt-6 ml-auto max-w-sm space-y-2">
                              <div className="flex justify-between">
                                <span className="text-slate-600">
                                  Subtotal
                                </span>

                                <span className="font-semibold">
                                  {formatCurrency(invoice.subtotal)}
                                </span>
                              </div>

                              <div className="flex justify-between">
                                <span className="text-slate-600">
                                  Tax
                                </span>

                                <span className="font-semibold">
                                  {formatCurrency(invoice.tax)}
                                </span>
                              </div>

                              <div className="flex justify-between">
                                <span className="text-slate-600">
                                  Amount paid
                                </span>

                                <span className="font-semibold">
                                  {formatCurrency(invoice.amountPaid)}
                                </span>
                              </div>

                              <div className="flex justify-between">
                                <span className="text-slate-600">
                                  Balance due
                                </span>

                                <span className="font-semibold">
                                  {formatCurrency(invoice.balanceDue)}
                                </span>
                              </div>

                              <div className="flex justify-between border-t border-slate-300 pt-2 text-lg">
                                <span className="font-bold">Total</span>

                                <span className="font-bold">
                                  {formatCurrency(invoice.total)}
                                </span>
                              </div>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-3">
                              {invoice.status === "Draft" && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() =>
                                    void handleInvoiceUpdate(
                                      invoice.invoiceId,
                                      { status: "Sent" },
                                      `${invoice.invoiceNumber} was marked as sent.`,
                                    )
                                  }
                                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isUpdating
                                    ? "Updating..."
                                    : "Mark Sent"}
                                </button>
                              )}

                              {invoice.status !== "Paid" &&
                                invoice.status !== "Void" && (
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() =>
                                      void handleInvoiceUpdate(
                                        invoice.invoiceId,
                                        {
                                          amountPaid: invoice.total,
                                        },
                                        `${invoice.invoiceNumber} was marked as paid.`,
                                      )
                                    }
                                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isUpdating
                                      ? "Updating..."
                                      : "Mark Paid"}
                                  </button>
                                )}

                              {invoice.status !== "Paid" &&
                                invoice.status !== "Overdue" &&
                                invoice.status !== "Void" && (
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() =>
                                      void handleInvoiceUpdate(
                                        invoice.invoiceId,
                                        { status: "Overdue" },
                                        `${invoice.invoiceNumber} was marked as overdue.`,
                                      )
                                    }
                                    className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isUpdating
                                      ? "Updating..."
                                      : "Mark Overdue"}
                                  </button>
                                )}

                              {invoice.status !== "Void" && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => {
                                    const confirmed = window.confirm(
                                      `Void ${invoice.invoiceNumber}? This preserves the invoice but marks it as void.`,
                                    );

                                    if (!confirmed) {
                                      return;
                                    }

                                    void handleInvoiceUpdate(
                                      invoice.invoiceId,
                                      { status: "Void" },
                                      `${invoice.invoiceNumber} was voided.`,
                                    );
                                  }}
                                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isUpdating
                                    ? "Updating..."
                                    : "Void Invoice"}
                                </button>
                              )}
                            </div>

                            {invoice.notes && (
                              <div className="mt-6">
                                <p className="text-sm font-semibold text-slate-500">
                                  Notes
                                </p>

                                <p className="mt-1 whitespace-pre-wrap text-slate-700">
                                  {invoice.notes}
                                </p>
                              </div>
                            )}
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

      <InvoiceModal
        isOpen={showCreateInvoice}
        onClose={() => setShowCreateInvoice(false)}
        onCreated={(invoice) => {
          setInvoices((currentInvoices) => [
            invoice,
            ...currentInvoices,
          ]);

          setExpandedInvoiceId(invoice.invoiceId);

          setSuccessMessage(
            `${invoice.invoiceNumber} was created successfully.`,
          );
        }}
      />
    </section>
  );
}
