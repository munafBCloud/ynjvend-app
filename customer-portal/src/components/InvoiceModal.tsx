import { useEffect, useMemo, useState } from "react";

import { createInvoice } from "../services/invoices";
import { getCustomers } from "../services/customers";
import { getInventory } from "../services/inventory";

import type { Customer } from "../types/customer";
import type { InventoryItem } from "../types/inventory";
import type { Invoice } from "../types/invoice";

type InvoiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
};

type ProductSelection = Record<
  string,
  {
    quantity: number;
    unitPrice: number;
  }
>;

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultDueDate() {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  return dueDate.toISOString().slice(0, 10);
}

export default function InvoiceModal({
  isOpen,
  onClose,
  onCreated,
}: InvoiceModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(getToday());
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [tax, setTax] = useState(0);
  const [notes, setNotes] = useState("");
  const [productSelections, setProductSelections] =
    useState<ProductSelection>({});

  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    async function loadFormData() {
      try {
        setLoadingData(true);
        setError("");

        const [loadedCustomers, loadedInventory] = await Promise.all([
          getCustomers(),
          getInventory(),
        ]);

        setCustomers(loadedCustomers);
        setInventory(loadedInventory);

        const initialSelections: ProductSelection = {};

        loadedInventory.forEach((item) => {
          initialSelections[item.productId] = {
            quantity: 0,
            unitPrice: Number(item.sellingPrice ?? 0),
          };
        });

        setProductSelections(initialSelections);
      } catch (loadError) {
        console.error("Unable to load invoice form data:", loadError);

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load customers and inventory.",
        );
      } finally {
        setLoadingData(false);
      }
    }

    void loadFormData();
  }, [isOpen]);

  const selectedCustomer = useMemo(
    () =>
      customers.find((customer) => customer.customerId === customerId) ??
      null,
    [customerId, customers],
  );

  const selectedItems = useMemo(() => {
    return inventory
      .filter((item) => {
        const selection = productSelections[item.productId];

        return selection && selection.quantity > 0;
      })
      .map((item) => {
        const selection = productSelections[item.productId];

        return {
          productId: item.productId,
          productName: item.productName,
          quantity: selection.quantity,
          unitPrice: selection.unitPrice,
          lineTotal: selection.quantity * selection.unitPrice,
        };
      });
  }, [inventory, productSelections]);

  const subtotal = useMemo(
    () =>
      selectedItems.reduce(
        (currentTotal, item) => currentTotal + item.lineTotal,
        0,
      ),
    [selectedItems],
  );

  const total = subtotal + tax;

  function resetForm() {
    setCustomerId("");
    setIssueDate(getToday());
    setDueDate(getDefaultDueDate());
    setTax(0);
    setNotes("");
    setProductSelections({});
    setError("");
  }

  function handleClose() {
    if (submitting) {
      return;
    }

    resetForm();
    onClose();
  }

  function updateQuantity(productId: string, quantity: number) {
    setProductSelections((currentSelections) => ({
      ...currentSelections,
      [productId]: {
        quantity: Math.max(0, Math.floor(quantity)),
        unitPrice: currentSelections[productId]?.unitPrice ?? 0,
      },
    }));
  }

  function updateUnitPrice(productId: string, unitPrice: number) {
    setProductSelections((currentSelections) => ({
      ...currentSelections,
      [productId]: {
        quantity: currentSelections[productId]?.quantity ?? 0,
        unitPrice: Math.max(0, unitPrice),
      },
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCustomer) {
      setError("Select a customer.");
      return;
    }

    if (selectedItems.length === 0) {
      setError("Add at least one invoice item.");
      return;
    }

    if (!issueDate || !dueDate) {
      setError("Issue date and due date are required.");
      return;
    }

    if (new Date(dueDate).getTime() < new Date(issueDate).getTime()) {
      setError("Due date cannot be before the issue date.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const createdInvoice = await createInvoice({
        customerId: selectedCustomer.customerId,
        businessName: selectedCustomer.businessName,
        issueDate,
        dueDate,
        status: "Draft",
        tax,
        amountPaid: 0,
        notes: notes.trim(),
        items: selectedItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      onCreated(createdInvoice);
      resetForm();
      onClose();
    } catch (createError) {
      console.error("Unable to create invoice:", createError);

      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create invoice.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-8">
      <div className="mx-auto max-w-5xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
              Billing
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              Create Invoice
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Select a customer, add products, and confirm pricing.
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
            <p className="text-slate-600">Loading invoice form...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="font-semibold text-red-800">{error}</p>
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label
                  htmlFor="invoice-customer"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Customer
                </label>

                <select
                  id="invoice-customer"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  disabled={submitting}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
                >
                  <option value="">Select a customer</option>

                  {customers.map((customer) => (
                    <option
                      key={customer.customerId}
                      value={customer.customerId}
                    >
                      {customer.businessName}
                    </option>
                  ))}
                </select>
              </div>

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
                  onChange={(event) => setIssueDate(event.target.value)}
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
                  onChange={(event) => setDueDate(event.target.value)}
                  disabled={submitting}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
                />
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-bold text-slate-950">
                Invoice items
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                Enter the quantity and selling price for each product.
              </p>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[1.5fr_120px_150px_150px] gap-4 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
                    <span>Product</span>
                    <span>Quantity</span>
                    <span>Unit price</span>
                    <span>Line total</span>
                  </div>

                  {inventory.map((item) => {
                    const selection = productSelections[item.productId] ?? {
                      quantity: 0,
                      unitPrice: 0,
                    };

                    return (
                      <div
                        key={item.productId}
                        className="grid grid-cols-[1.5fr_120px_150px_150px] gap-4 border-t border-slate-200 px-4 py-4"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">
                            {item.productName}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {item.brand} · {item.quantityInStock} in stock
                          </p>
                        </div>

                        <input
                          type="number"
                          min="0"
                          max={item.quantityInStock}
                          step="1"
                          value={selection.quantity}
                          onChange={(event) =>
                            updateQuantity(
                              item.productId,
                              Number(event.target.value),
                            )
                          }
                          disabled={submitting}
                          className="h-fit rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-red-700"
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={selection.unitPrice}
                          onChange={(event) =>
                            updateUnitPrice(
                              item.productId,
                              Number(event.target.value),
                            )
                          }
                          disabled={submitting}
                          className="h-fit rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-red-700"
                        />

                        <p className="py-2 font-semibold text-slate-950">
                          {formatCurrency(
                            selection.quantity * selection.unitPrice,
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-[1fr_340px]">
              <div>
                <label
                  htmlFor="invoice-notes"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Notes
                </label>

                <textarea
                  id="invoice-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={submitting}
                  rows={5}
                  maxLength={2000}
                  placeholder="Payment terms or additional information"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div className="rounded-xl bg-slate-100 p-5">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="invoice-tax"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Tax amount
                  </label>

                  <input
                    id="invoice-tax"
                    type="number"
                    min="0"
                    step="0.01"
                    value={tax}
                    onChange={(event) =>
                      setTax(Math.max(0, Number(event.target.value)))
                    }
                    disabled={submitting}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-red-700"
                  />
                </div>

                <div className="mt-5 flex justify-between border-t border-slate-300 pt-4 text-xl">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
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
                disabled={submitting}
                className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating Invoice..." : "Create Invoice"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
