import { useState } from "react";

type InventoryModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    productName: string;
    brand: string;
    quantityInStock: number;
    lowStock: number;
    caseCost: string;
  }) => Promise<void>;
};

export default function InventoryModal({
  open,
  onClose,
  onSubmit,
}: InventoryModalProps) {
  const [form, setForm] = useState({
    productName: "",
    brand: "",
    quantityInStock: "",
    lowStock: "",
    caseCost: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    if (
      !form.productName ||
      !form.brand ||
      !form.quantityInStock ||
      !form.lowStock ||
      !form.caseCost
    ) {
      setError("Please complete all fields.");
      return;
    }

    try {
      setLoading(true);

      await onSubmit({
        productName: form.productName.trim(),
        brand: form.brand.trim(),
        quantityInStock: Number(form.quantityInStock),
        lowStock: Number(form.lowStock),
        caseCost: form.caseCost,
      });

      setForm({
        productName: "",
        brand: "",
        quantityInStock: "",
        lowStock: "",
        caseCost: "",
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add inventory.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-2xl font-bold mb-6">
          Add Inventory
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            className="w-full rounded-lg border p-3"
            placeholder="Product Name"
            value={form.productName}
            onChange={(e) =>
              setForm({ ...form, productName: e.target.value })
            }
          />

          <input
            className="w-full rounded-lg border p-3"
            placeholder="Brand"
            value={form.brand}
            onChange={(e) =>
              setForm({ ...form, brand: e.target.value })
            }
          />

          <input
            className="w-full rounded-lg border p-3"
            placeholder="Quantity In Stock"
            type="number"
            value={form.quantityInStock}
            onChange={(e) =>
              setForm({ ...form, quantityInStock: e.target.value })
            }
          />

          <input
            className="w-full rounded-lg border p-3"
            placeholder="Low Stock Threshold"
            type="number"
            value={form.lowStock}
            onChange={(e) =>
              setForm({ ...form, lowStock: e.target.value })
            }
          />

          <input
            className="w-full rounded-lg border p-3"
            placeholder="Case Cost"
            value={form.caseCost}
            onChange={(e) =>
              setForm({ ...form, caseCost: e.target.value })
            }
          />

          {error && (
            <p className="text-red-700 text-sm">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-4">

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2"
            >
              Cancel
            </button>

            <button
              disabled={loading}
              className="rounded-lg bg-red-700 px-4 py-2 text-white"
            >
              {loading ? "Saving..." : "Add Inventory"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}
