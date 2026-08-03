import { useState } from "react";

import type {
  CreateInventoryInput,
  InventoryStatus,
} from "../types/inventory";

type InventoryModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInventoryInput) => Promise<void>;
};

type InventoryFormState = {
  productName: string;
  brand: string;
  quantityInStock: string;
  reorderLevel: string;
  caseCost: string;
  sellingPrice: string;
  status: InventoryStatus;
};

const INITIAL_FORM: InventoryFormState = {
  productName: "",
  brand: "",
  quantityInStock: "",
  reorderLevel: "",
  caseCost: "",
  sellingPrice: "",
  status: "active",
};

export default function InventoryModal({
  open,
  onClose,
  onSubmit,
}: InventoryModalProps) {
  const [form, setForm] =
    useState<InventoryFormState>(INITIAL_FORM);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return null;
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setError("");
  }

  function handleClose() {
    if (loading) {
      return;
    }

    resetForm();
    onClose();
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    const productName = form.productName.trim();
    const brand = form.brand.trim();

    const quantityInStock = Number(form.quantityInStock);
    const reorderLevel = Number(form.reorderLevel);
    const caseCost = Number(form.caseCost);
    const sellingPrice = Number(form.sellingPrice);

    if (
      !productName ||
      !brand ||
      form.quantityInStock === "" ||
      form.reorderLevel === "" ||
      form.caseCost === "" ||
      form.sellingPrice === ""
    ) {
      setError("Please complete all fields.");
      return;
    }

    if (
      !Number.isInteger(quantityInStock) ||
      quantityInStock < 0
    ) {
      setError(
        "Quantity in stock must be a non-negative whole number.",
      );
      return;
    }

    if (
      !Number.isInteger(reorderLevel) ||
      reorderLevel < 0
    ) {
      setError(
        "Reorder level must be a non-negative whole number.",
      );
      return;
    }

    if (!Number.isFinite(caseCost) || caseCost < 0) {
      setError("Case cost must be a valid non-negative amount.");
      return;
    }

    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      setError(
        "Selling price must be a valid non-negative amount.",
      );
      return;
    }

    try {
      setLoading(true);

      await onSubmit({
        productName,
        brand,
        quantityInStock,
        reorderLevel,
        caseCost,
        sellingPrice,
        status: form.status,
      });

      resetForm();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to add inventory.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-8">
      <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
              Inventory Management
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              Add Inventory Product
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Add stock, cost, and default customer pricing.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                {error}
              </p>
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="inventory-product-name"
                className="block text-sm font-semibold text-slate-700"
              >
                Product name
              </label>

              <input
                id="inventory-product-name"
                value={form.productName}
                onChange={(event) =>
                  setForm({
                    ...form,
                    productName: event.target.value,
                  })
                }
                disabled={loading}
                maxLength={150}
                placeholder="Coke 12 Pack"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div>
              <label
                htmlFor="inventory-brand"
                className="block text-sm font-semibold text-slate-700"
              >
                Brand
              </label>

              <input
                id="inventory-brand"
                value={form.brand}
                onChange={(event) =>
                  setForm({
                    ...form,
                    brand: event.target.value,
                  })
                }
                disabled={loading}
                maxLength={100}
                placeholder="Coca-Cola"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div>
              <label
                htmlFor="inventory-quantity"
                className="block text-sm font-semibold text-slate-700"
              >
                Quantity in stock
              </label>

              <input
                id="inventory-quantity"
                type="number"
                min="0"
                step="1"
                value={form.quantityInStock}
                onChange={(event) =>
                  setForm({
                    ...form,
                    quantityInStock: event.target.value,
                  })
                }
                disabled={loading}
                placeholder="0"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div>
              <label
                htmlFor="inventory-reorder-level"
                className="block text-sm font-semibold text-slate-700"
              >
                Reorder level
              </label>

              <input
                id="inventory-reorder-level"
                type="number"
                min="0"
                step="1"
                value={form.reorderLevel}
                onChange={(event) =>
                  setForm({
                    ...form,
                    reorderLevel: event.target.value,
                  })
                }
                disabled={loading}
                placeholder="10"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div>
              <label
                htmlFor="inventory-case-cost"
                className="block text-sm font-semibold text-slate-700"
              >
                Case cost
              </label>

              <input
                id="inventory-case-cost"
                type="number"
                min="0"
                step="0.01"
                value={form.caseCost}
                onChange={(event) =>
                  setForm({
                    ...form,
                    caseCost: event.target.value,
                  })
                }
                disabled={loading}
                placeholder="15.00"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
              />

              <p className="mt-1 text-xs text-slate-500">
                The amount paid to acquire one case.
              </p>
            </div>

            <div>
              <label
                htmlFor="inventory-selling-price"
                className="block text-sm font-semibold text-slate-700"
              >
                Selling price
              </label>

              <input
                id="inventory-selling-price"
                type="number"
                min="0"
                step="0.01"
                value={form.sellingPrice}
                onChange={(event) =>
                  setForm({
                    ...form,
                    sellingPrice: event.target.value,
                  })
                }
                disabled={loading}
                placeholder="22.00"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
              />

              <p className="mt-1 text-xs text-slate-500">
                The default amount charged to customers.
              </p>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="inventory-status"
                className="block text-sm font-semibold text-slate-700"
              >
                Product status
              </label>

              <select
                id="inventory-status"
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as InventoryStatus,
                  })
                }
                disabled={loading}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Add Inventory"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
