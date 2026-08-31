import {
  useState,
  type FormEvent,
} from "react";

import type {
  CreateInventoryInput,
  InventoryStatus,
} from "../types/inventory";

type InventoryModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: CreateInventoryInput,
  ) => Promise<void>;
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
    useState<InventoryFormState>(
      INITIAL_FORM,
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

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
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    const productName =
      form.productName.trim();

    const brand =
      form.brand.trim();

    const quantityInStock =
      Number(form.quantityInStock);

    const reorderLevel =
      Number(form.reorderLevel);

    const caseCost =
      Number(form.caseCost);

    const sellingPrice =
      Number(form.sellingPrice);

    if (
      !productName ||
      !brand ||
      form.quantityInStock === "" ||
      form.reorderLevel === "" ||
      form.caseCost === "" ||
      form.sellingPrice === ""
    ) {
      setError(
        "Please complete all fields.",
      );

      return;
    }

    if (
      !Number.isInteger(
        quantityInStock,
      ) ||
      quantityInStock < 0
    ) {
      setError(
        "Quantity in stock must be a non-negative whole number.",
      );

      return;
    }

    if (
      !Number.isInteger(
        reorderLevel,
      ) ||
      reorderLevel < 0
    ) {
      setError(
        "Reorder level must be a non-negative whole number.",
      );

      return;
    }

    if (
      !Number.isFinite(caseCost) ||
      caseCost < 0
    ) {
      setError(
        "Case cost must be a valid non-negative amount.",
      );

      return;
    }

    if (
      !Number.isFinite(
        sellingPrice,
      ) ||
      sellingPrice < 0
    ) {
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
    <div
      className="dd-inventory-modal"
      role="presentation"
    >
      <button
        type="button"
        className="dd-inventory-modal__backdrop"
        onClick={handleClose}
        aria-label="Close add product dialog"
        disabled={loading}
      />

      <div
        className="dd-inventory-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-modal-title"
      >
        <header className="dd-inventory-modal__header">
          <div>
            <div className="dd-inventory-modal__eyebrow">
              <span />
              Inventory Control
            </div>

            <h2 id="inventory-modal-title">
              Add Product
            </h2>

            <p>
              Create a new inventory item
              with stock, cost, pricing,
              and reorder information.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="dd-inventory-modal__close"
            aria-label="Close"
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

        <form
          onSubmit={handleSubmit}
          className="dd-inventory-modal__form"
        >
          {error && (
            <div
              className="dd-inventory-modal__error"
              role="alert"
            >
              <div className="dd-inventory-modal__error-icon">
                !
              </div>

              <div>
                <strong>
                  Product could not be saved
                </strong>

                <p>{error}</p>
              </div>
            </div>
          )}

          <section className="dd-inventory-modal__section">
            <div className="dd-inventory-modal__section-heading">
              <span>01</span>

              <div>
                <strong>
                  Product Details
                </strong>

                <p>
                  Basic product identification.
                </p>
              </div>
            </div>

            <div className="dd-inventory-modal__grid">
              <FormField
                label="Product Name"
                htmlFor="inventory-product-name"
              >
                <input
                  id="inventory-product-name"
                  value={form.productName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      productName:
                        event.target.value,
                    })
                  }
                  disabled={loading}
                  maxLength={150}
                  placeholder="Coke 12 Pack"
                  autoFocus
                />
              </FormField>

              <FormField
                label="Brand"
                htmlFor="inventory-brand"
              >
                <input
                  id="inventory-brand"
                  value={form.brand}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      brand:
                        event.target.value,
                    })
                  }
                  disabled={loading}
                  maxLength={100}
                  placeholder="Coca-Cola"
                />
              </FormField>
            </div>
          </section>

          <section className="dd-inventory-modal__section">
            <div className="dd-inventory-modal__section-heading">
              <span>02</span>

              <div>
                <strong>
                  Stock Control
                </strong>

                <p>
                  Set current quantity and
                  reorder threshold.
                </p>
              </div>
            </div>

            <div className="dd-inventory-modal__grid">
              <FormField
                label="Quantity In Stock"
                htmlFor="inventory-quantity"
                hint="Current cases available"
              >
                <input
                  id="inventory-quantity"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={
                    form.quantityInStock
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      quantityInStock:
                        event.target.value,
                    })
                  }
                  disabled={loading}
                  placeholder="0"
                />
              </FormField>

              <FormField
                label="Reorder Level"
                htmlFor="inventory-reorder-level"
                hint="Low-stock threshold"
              >
                <input
                  id="inventory-reorder-level"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={
                    form.reorderLevel
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      reorderLevel:
                        event.target.value,
                    })
                  }
                  disabled={loading}
                  placeholder="10"
                />
              </FormField>
            </div>
          </section>

          <section className="dd-inventory-modal__section">
            <div className="dd-inventory-modal__section-heading">
              <span>03</span>

              <div>
                <strong>
                  Pricing
                </strong>

                <p>
                  Define acquisition cost
                  and default selling price.
                </p>
              </div>
            </div>

            <div className="dd-inventory-modal__grid">
              <FormField
                label="Case Cost"
                htmlFor="inventory-case-cost"
                hint="Cost paid per case"
                prefix="$"
              >
                <input
                  id="inventory-case-cost"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={form.caseCost}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      caseCost:
                        event.target.value,
                    })
                  }
                  disabled={loading}
                  placeholder="15.00"
                />
              </FormField>

              <FormField
                label="Selling Price"
                htmlFor="inventory-selling-price"
                hint="Default customer price"
                prefix="$"
              >
                <input
                  id="inventory-selling-price"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={
                    form.sellingPrice
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      sellingPrice:
                        event.target.value,
                    })
                  }
                  disabled={loading}
                  placeholder="22.00"
                />
              </FormField>
            </div>
          </section>

          <section className="dd-inventory-modal__section dd-inventory-modal__section--last">
            <div className="dd-inventory-modal__section-heading">
              <span>04</span>

              <div>
                <strong>
                  Product Status
                </strong>

                <p>
                  Control operational
                  availability.
                </p>
              </div>
            </div>

            <FormField
              label="Status"
              htmlFor="inventory-status"
            >
              <div className="dd-inventory-modal__select-wrap">
                <select
                  id="inventory-status"
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status:
                        event.target
                          .value as InventoryStatus,
                    })
                  }
                  disabled={loading}
                >
                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>

                  <option value="archived">
                    Archived
                  </option>
                </select>

                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="m8 10 4 4 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </FormField>
          </section>

          <footer className="dd-inventory-modal__footer">
            <div className="dd-inventory-modal__footer-note">
              <span />
              New inventory record
            </div>

            <div className="dd-inventory-modal__actions">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="dd-inventory-modal__cancel"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="dd-inventory-modal__submit"
              >
                {loading ? (
                  <>
                    <span className="dd-inventory-modal__spinner" />
                    Saving Product
                  </>
                ) : (
                  <>
                    <span>+</span>
                    Add Product
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  prefix?: string;
  children: React.ReactNode;
};

function FormField({
  label,
  htmlFor,
  hint,
  prefix,
  children,
}: FormFieldProps) {
  return (
    <div className="dd-inventory-modal__field">
      <div className="dd-inventory-modal__field-label">
        <label htmlFor={htmlFor}>
          {label}
        </label>

        {hint && (
          <span>{hint}</span>
        )}
      </div>

      <div
        className={
          prefix
            ? "dd-inventory-modal__control dd-inventory-modal__control--prefix"
            : "dd-inventory-modal__control"
        }
      >
        {prefix && (
          <span className="dd-inventory-modal__prefix">
            {prefix}
          </span>
        )}

        {children}
      </div>
    </div>
  );
}
