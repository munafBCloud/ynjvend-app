import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import InventoryModal from "../../components/InventoryModal";
import SummaryCard from "../../components/SummaryCard";

import {
  createInventory,
  getInventory,
} from "../../services/inventory";

import type {
  CreateInventoryInput,
  InventoryItem,
} from "../../types/inventory";

import {
  formatCurrency,
  formatDate,
} from "../../utils/formatters";

export default function OwnerInventoryPage() {
  const [inventory, setInventory] = useState<
    InventoryItem[]
  >([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    showLowStockOnly,
    setShowLowStockOnly,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    isInventoryModalOpen,
    setIsInventoryModalOpen,
  ] = useState(false);

  const [
    inventoryActionError,
    setInventoryActionError,
  ] = useState("");

  useEffect(() => {
    async function loadInventory() {
      try {
        setLoading(true);
        setError("");

        const items =
          await getInventory();

        setInventory(items);
      } catch (loadError) {
        console.error(
          "Unable to load inventory:",
          loadError,
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load inventory.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadInventory();
  }, []);

  async function handleCreateInventory(
    input: CreateInventoryInput,
  ) {
    try {
      setInventoryActionError("");

      await createInventory(input);

      const refreshedInventory =
        await getInventory();

      setInventory(refreshedInventory);
    } catch (actionError) {
      console.error(
        "Unable to create inventory:",
        actionError,
      );

      const message =
        actionError instanceof Error
          ? actionError.message
          : "Unable to create inventory.";

      setInventoryActionError(message);

      throw actionError;
    }
  }

  const reorderLevelItems = useMemo(
    () =>
      inventory.filter(
        (item) =>
          item.quantityInStock <=
          item.reorderLevel,
      ),
    [inventory],
  );

  const totalCases = useMemo(
    () =>
      inventory.reduce(
        (total, item) =>
          total +
          Number(
            item.quantityInStock || 0,
          ),
        0,
      ),
    [inventory],
  );

  const filteredInventory = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    return [...inventory]
      .filter((item) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          item.productName
            .toLowerCase()
            .includes(normalizedSearch) ||
          item.brand
            .toLowerCase()
            .includes(normalizedSearch) ||
          item.productId
            .toLowerCase()
            .includes(normalizedSearch);

        const matchesLowStock =
          !showLowStockOnly ||
          item.quantityInStock <=
            item.reorderLevel;

        return (
          matchesSearch &&
          matchesLowStock
        );
      })
      .sort((first, second) =>
        first.productName.localeCompare(
          second.productName,
        ),
      );
  }, [
    inventory,
    searchTerm,
    showLowStockOnly,
  ]);

  const summaryCards = [
    {
      label: "Products",
      value: inventory.length,
      description: "Inventory catalog",
      accent: "blue" as const,
    },
    {
      label: "Total Cases",
      value: totalCases,
      description: "Current stock on hand",
      accent: "blue" as const,
    },
    {
      label: "Low Stock",
      value: reorderLevelItems.length,
      description: "At or below reorder level",
      accent:
        reorderLevelItems.length > 0
          ? ("orange" as const)
          : ("neutral" as const),
    },
    {
      label: "Results",
      value: filteredInventory.length,
      description: showLowStockOnly
        ? "Low-stock filter active"
        : "Products displayed",
      accent: "neutral" as const,
    },
  ];

  return (
    <section className="dd-inventory">
      <div className="dd-inventory__inner">
        <header className="dd-inventory__header">
          <div>
            <div className="dd-inventory__eyebrow">
              <span />
              Inventory Control
            </div>

            <h1>Product Inventory</h1>

            <p>
              Monitor stock levels, pricing,
              reorder thresholds, and product
              availability.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setInventoryActionError("");
              setIsInventoryModalOpen(true);
            }}
            className="dd-inventory__add"
          >
            <span
              className="dd-inventory__add-plus"
              aria-hidden="true"
            >
              +
            </span>

            <span>Add Product</span>
          </button>
        </header>

        {inventoryActionError && (
          <ErrorMessage
            title="Unable to complete inventory action"
            message={inventoryActionError}
            className="mt-6"
          />
        )}

        {loading && (
          <LoadingState message="Loading inventory..." />
        )}

        {!loading && error && (
          <ErrorMessage
            title="Unable to load inventory"
            message={error}
          />
        )}

        {!loading && !error && (
          <>
            <div className="dd-inventory__metrics">
              {summaryCards.map((card) => (
                <SummaryCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  description={
                    card.description
                  }
                  accent={card.accent}
                />
              ))}
            </div>

            <section className="dd-inventory__controls">
              <div className="dd-inventory__search">
                <label htmlFor="inventory-search">
                  Search Inventory
                </label>

                <div className="dd-inventory__search-input">
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
                    id="inventory-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(
                        event.target.value,
                      )
                    }
                    placeholder="Product, brand, or product ID"
                  />

                  {searchTerm.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSearchTerm("")
                      }
                      className="dd-inventory__clear"
                      aria-label="Clear inventory search"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                aria-pressed={
                  showLowStockOnly
                }
                onClick={() =>
                  setShowLowStockOnly(
                    (currentValue) =>
                      !currentValue,
                  )
                }
                className={[
                  "dd-inventory__filter",
                  showLowStockOnly
                    ? "dd-inventory__filter--active"
                    : "",
                ].join(" ")}
              >
                <span
                  className="dd-inventory__filter-dot"
                  aria-hidden="true"
                />

                <span>
                  {showLowStockOnly
                    ? "Low Stock Active"
                    : "Low Stock"}
                </span>

                {reorderLevelItems.length >
                  0 && (
                  <span className="dd-inventory__filter-count">
                    {
                      reorderLevelItems.length
                    }
                  </span>
                )}
              </button>
            </section>

            <section className="dd-inventory__directory">
              <div className="dd-inventory__directory-header">
                <div>
                  <p className="dd-label">
                    Inventory Directory
                  </p>

                  <h2>
                    Stock Overview
                  </h2>
                </div>

                <p className="dd-inventory__result-count">
                  Showing{" "}
                  <strong>
                    {
                      filteredInventory.length
                    }
                  </strong>{" "}
                  of{" "}
                  <strong>
                    {inventory.length}
                  </strong>
                </p>
              </div>

              {filteredInventory.length ===
              0 ? (
                <div className="dd-inventory__empty">
                  <div className="dd-inventory__empty-icon">
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="m4 8 8-4 8 4-8 4-8-4Zm0 0v8l8 4 8-4V8M12 12v8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div>
                    <strong>
                      No products found
                    </strong>

                    <p>
                      Adjust your search or
                      low-stock filter.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="dd-inventory__desktop-table">
                    <table>
                      <thead>
                        <tr>
                          <TableHeading>
                            Product
                          </TableHeading>

                          <TableHeading>
                            Brand
                          </TableHeading>

                          <TableHeading align="right">
                            Stock
                          </TableHeading>

                          <TableHeading align="right">
                            Reorder
                          </TableHeading>

                          <TableHeading align="right">
                            Cost
                          </TableHeading>

                          <TableHeading align="right">
                            Sell
                          </TableHeading>

                          <TableHeading>
                            Status
                          </TableHeading>

                          <TableHeading>
                            Created
                          </TableHeading>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredInventory.map(
                          (item) => (
                            <InventoryTableRow
                              key={
                                item.productId
                              }
                              item={item}
                            />
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="dd-inventory__mobile-list">
                    {filteredInventory.map(
                      (item) => (
                        <InventoryMobileCard
                          key={
                            item.productId
                          }
                          item={item}
                        />
                      ),
                    )}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>

      <InventoryModal
        open={isInventoryModalOpen}
        onClose={() =>
          setIsInventoryModalOpen(false)
        }
        onSubmit={
          handleCreateInventory
        }
      />
    </section>
  );
}

function InventoryTableRow({
  item,
}: {
  item: InventoryItem;
}) {
  const isLowStock =
    item.quantityInStock <=
    item.reorderLevel;

  return (
    <tr>
      <TableCell>
        <div className="dd-inventory__product">
          <div
            className={[
              "dd-inventory__product-marker",
              isLowStock
                ? "dd-inventory__product-marker--warning"
                : "",
            ].join(" ")}
          />

          <div>
            <p className="dd-inventory__product-name">
              {item.productName}
            </p>

            <p className="dd-inventory__product-id">
              {item.productId}
            </p>

            {item.barcode && (
              <p className="dd-inventory__barcode">
                {item.barcodeType
                  ? `${item.barcodeType} · `
                  : ""}
                {item.barcode}
              </p>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell>
        <span className="dd-inventory__brand">
          {item.brand}
        </span>
      </TableCell>

      <TableCell align="right">
        <span
          className={[
            "dd-inventory__stock",
            isLowStock
              ? "dd-inventory__stock--low"
              : "",
          ].join(" ")}
        >
          {item.quantityInStock}
        </span>
      </TableCell>

      <TableCell align="right">
        <span className="dd-inventory__number">
          {item.reorderLevel}
        </span>
      </TableCell>

      <TableCell align="right">
        <span className="dd-inventory__money">
          {formatCurrency(
            item.caseCost,
          )}
        </span>
      </TableCell>

      <TableCell align="right">
        <div className="dd-inventory__price">
          <strong>
            {formatCurrency(
              item.sellingPrice,
            )}
          </strong>

          <span>
            +{" "}
            {formatCurrency(
              Number(
                item.sellingPrice,
              ) -
                Number(
                  item.caseCost,
                ),
            )}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <InventoryStatus
          item={item}
        />
      </TableCell>

      <TableCell>
        <span className="dd-inventory__date">
          {formatDate(
            item.createdAt,
          )}
        </span>
      </TableCell>
    </tr>
  );
}

function InventoryMobileCard({
  item,
}: {
  item: InventoryItem;
}) {
  const isLowStock =
    item.quantityInStock <=
    item.reorderLevel;

  return (
    <article className="dd-inventory__mobile-card">
      <div className="dd-inventory__mobile-top">
        <div className="dd-inventory__product">
          <div
            className={[
              "dd-inventory__product-marker",
              isLowStock
                ? "dd-inventory__product-marker--warning"
                : "",
            ].join(" ")}
          />

          <div>
            <p className="dd-inventory__product-name">
              {item.productName}
            </p>

            <p className="dd-inventory__mobile-brand">
              {item.brand}
            </p>
          </div>
        </div>

        <InventoryStatus
          item={item}
        />
      </div>

      <div className="dd-inventory__mobile-stock">
        <div>
          <span>In Stock</span>

          <strong
            className={
              isLowStock
                ? "dd-inventory__mobile-stock-low"
                : ""
            }
          >
            {item.quantityInStock}
          </strong>
        </div>

        <div>
          <span>Reorder At</span>
          <strong>
            {item.reorderLevel}
          </strong>
        </div>

        <div>
          <span>Sell Price</span>
          <strong>
            {formatCurrency(
              item.sellingPrice,
            )}
          </strong>
        </div>
      </div>

      <div className="dd-inventory__mobile-details">
        <div>
          <span>Case Cost</span>

          <strong>
            {formatCurrency(
              item.caseCost,
            )}
          </strong>
        </div>

        <div>
          <span>Margin</span>

          <strong>
            {formatCurrency(
              Number(
                item.sellingPrice,
              ) -
                Number(
                  item.caseCost,
                ),
            )}
          </strong>
        </div>
      </div>

      <div className="dd-inventory__mobile-footer">
        <div>
          <span className="dd-inventory__product-id">
            {item.productId}
          </span>

          {item.barcode && (
            <span className="dd-inventory__barcode">
              {item.barcode}
            </span>
          )}
        </div>

        <span className="dd-inventory__date">
          {formatDate(
            item.createdAt,
          )}
        </span>
      </div>
    </article>
  );
}

function InventoryStatus({
  item,
}: {
  item: InventoryItem;
}) {
  const isLowStock =
    item.quantityInStock <=
    item.reorderLevel;

  if (item.status !== "active") {
    return (
      <span className="dd-inventory__status dd-inventory__status--inactive">
        <span />
        {item.status}
      </span>
    );
  }

  return (
    <span
      className={[
        "dd-inventory__status",
        isLowStock
          ? "dd-inventory__status--low"
          : "dd-inventory__status--ok",
      ].join(" ")}
    >
      <span />

      {isLowStock
        ? "Low Stock"
        : "In Stock"}
    </span>
  );
}

type TableContentProps = {
  children: ReactNode;
  align?: "left" | "right";
};

function TableHeading({
  children,
  align = "left",
}: TableContentProps) {
  return (
    <th
      scope="col"
      className={
        align === "right"
          ? "dd-inventory__th dd-inventory__th--right"
          : "dd-inventory__th"
      }
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
  align = "left",
}: TableContentProps) {
  return (
    <td
      className={
        align === "right"
          ? "dd-inventory__td dd-inventory__td--right"
          : "dd-inventory__td"
      }
    >
      {children}
    </td>
  );
}
