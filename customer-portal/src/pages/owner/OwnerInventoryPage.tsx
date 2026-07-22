import { useEffect, useMemo, useState } from "react";
import type { InventoryItem } from "../../types/inventory";
import { getInventory } from "../../services/inventory";

export default function OwnerInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInventory() {
      try {
        setLoading(true);
        setError("");

        const items = await getInventory();

        setInventory(items); 
      } catch (error) {
        console.error("Unable to load inventory:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load inventory."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadInventory();
  }, []);

  const lowStockItems = useMemo(
    () =>
      inventory.filter(
        (item) => item.quantityInStock <= item.lowStock
      ),
    [inventory]
  );

  const totalCases = useMemo(
    () =>
      inventory.reduce(
        (total, item) => total + item.quantityInStock,
        0
      ),
    [inventory]
  );

  const filteredInventory = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...inventory]
      .filter((item) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          item.productName
            .toLowerCase()
            .includes(normalizedSearch) ||
          item.brand.toLowerCase().includes(normalizedSearch) ||
          item.productId.toLowerCase().includes(normalizedSearch);

        const matchesLowStock =
          !showLowStockOnly ||
          item.quantityInStock <= item.lowStock;

        return matchesSearch && matchesLowStock;
      })
      .sort((first, second) =>
        first.productName.localeCompare(second.productName)
      );
  }, [inventory, searchTerm, showLowStockOnly]);

  function formatCurrency(value: string) {
    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
      return value || "Not set";
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numericValue);
  }

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
            Inventory Management
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            Product Inventory
          </h2>

          <p className="mt-3 text-slate-600">
            Review stock levels, product costs, and items that
            may need to be reordered.
          </p>
        </div>

        {loading && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-slate-600">
              Loading inventory...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
            <p className="font-semibold text-red-800">
              Unable to load inventory
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
                label="Total Products"
                value={inventory.length}
              />

              <SummaryCard
                label="Total Cases"
                value={totalCases}
              />

              <SummaryCard
                label="Low Stock Products"
                value={lowStockItems.length}
              />

              <SummaryCard
                label="Showing Results"
                value={filteredInventory.length}
              />
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label
                    htmlFor="inventory-search"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Search inventory
                  </label>

                  <input
                    id="inventory-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.target.value)
                    }
                    placeholder="Search product, brand, or product ID"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowLowStockOnly((currentValue) => !currentValue)
                  }
                  className={[
                    "rounded-xl px-5 py-3 text-sm font-semibold transition",
                    showLowStockOnly
                      ? "bg-red-700 text-white hover:bg-red-800"
                      : "bg-slate-950 text-white hover:bg-slate-800",
                  ].join(" ")}
                >
                  {showLowStockOnly
                    ? "Showing Low Stock"
                    : "Show Low Stock Only"}
                </button>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h3 className="text-xl font-bold text-slate-950">
                  Inventory Directory
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  Showing {filteredInventory.length} of{" "}
                  {inventory.length} products.
                </p>
              </div>

              {filteredInventory.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="font-semibold text-slate-800">
                    No inventory products found
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Try changing the search term or low-stock
                    filter.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <TableHeading>Product</TableHeading>
                        <TableHeading>Brand</TableHeading>
                        <TableHeading>In Stock</TableHeading>
                        <TableHeading>Low Stock Level</TableHeading>
                        <TableHeading>Case Cost</TableHeading>
                        <TableHeading>Status</TableHeading>
                        <TableHeading>Created</TableHeading>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {filteredInventory.map((item) => {
                        const isLowStock =
                          item.quantityInStock <= item.lowStock;

                        return (
                          <tr
                            key={item.productId}
                            className="hover:bg-slate-50"
                          >
                            <TableCell>
                              <p className="font-semibold text-slate-950">
                                {item.productName}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {item.productId}
                              </p>
                            </TableCell>

                            <TableCell>
                              <p className="text-slate-800">
                                {item.brand}
                              </p>
                            </TableCell>

                            <TableCell>
                              <p className="text-lg font-bold text-slate-950">
                                {item.quantityInStock}
                              </p>
                            </TableCell>

                            <TableCell>
                              <p className="text-slate-700">
                                {item.lowStock}
                              </p>
                            </TableCell>

                            <TableCell>
                              <p className="font-medium text-slate-900">
                                {formatCurrency(item.caseCost)}
                              </p>
                            </TableCell>

                            <TableCell>
                              <span
                                className={[
                                  "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                                  isLowStock
                                    ? "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800",
                                ].join(" ")}
                              >
                                {isLowStock
                                  ? "Low Stock"
                                  : "In Stock"}
                              </span>
                            </TableCell>

                            <TableCell>
                              <p className="whitespace-nowrap text-sm text-slate-600">
                                {formatDate(item.createdAt)}
                              </p>
                            </TableCell>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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

type TableContentProps = {
  children: React.ReactNode;
};

function TableHeading({
  children,
}: TableContentProps) {
  return (
    <th
      scope="col"
      className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
}: TableContentProps) {
  return (
    <td className="px-6 py-5 align-top">
      {children}
    </td>
  );
}
