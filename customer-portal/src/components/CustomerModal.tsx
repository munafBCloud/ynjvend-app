import {
  useState,
  type FormEvent,
} from "react";

import type {
  CreateCustomerInput,
} from "../types/customer";

type CustomerModalProps = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onCreate: (
    customer: CreateCustomerInput,
  ) => Promise<void>;
};

const EMPTY_FORM: CreateCustomerInput = {
  businessName: "",
  contactName: "",
  phone: "",
  locationAddress: "",
};

export default function CustomerModal({
  open,
  loading,
  onClose,
  onCreate,
}: CustomerModalProps) {
  const [form, setForm] =
    useState<CreateCustomerInput>(
      EMPTY_FORM,
    );

  const [error, setError] =
    useState("");

  if (!open) {
    return null;
  }

  function updateField<
    K extends keyof CreateCustomerInput,
  >(
    key: K,
    value: CreateCustomerInput[K],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (
      !form.businessName.trim() ||
      !form.contactName.trim() ||
      !form.phone.trim() ||
      !form.locationAddress.trim()
    ) {
      setError(
        "Please complete all required fields.",
      );

      return;
    }

    try {
      await onCreate({
        businessName:
          form.businessName.trim(),
        contactName:
          form.contactName.trim(),
        phone:
          form.phone.trim(),
        locationAddress:
          form.locationAddress.trim(),
      });

      setForm(EMPTY_FORM);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create customer.",
      );
    }
  }

  function handleClose() {
    if (loading) {
      return;
    }

    setError("");
    onClose();
  }

  return (
    <div
      className="dd-customer-modal"
      role="presentation"
    >
      <button
        type="button"
        className="dd-customer-modal__backdrop"
        onClick={handleClose}
        aria-label="Close add customer dialog"
        disabled={loading}
      />

      <div
        className="dd-customer-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-customer-title"
      >
        <header className="dd-customer-modal__header">
          <div>
            <div className="dd-customer-modal__eyebrow">
              <span />
              Customer Operations
            </div>

            <h2 id="add-customer-title">
              Add Customer
            </h2>

            <p>
              Create a new business
              customer record for orders
              and invoicing.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close customer form"
            className="dd-customer-modal__close"
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
          className="dd-customer-modal__form"
          onSubmit={(event) =>
            void handleSubmit(event)
          }
        >
          {error && (
            <div
              className="dd-customer-modal__error"
              role="alert"
            >
              <div className="dd-customer-modal__error-icon">
                !
              </div>

              <div>
                <strong>
                  Customer could not be saved
                </strong>

                <p>
                  {error}
                </p>
              </div>
            </div>
          )}

          <section className="dd-customer-modal__section">
            <div className="dd-customer-modal__section-heading">
              <span>01</span>

              <div>
                <strong>
                  Business
                </strong>

                <p>
                  Customer organization
                  information.
                </p>
              </div>
            </div>

            <div className="dd-customer-modal__fields">
              <Input
                id="business-name"
                label="Business Name"
                required
                value={form.businessName}
                onChange={(value) =>
                  updateField(
                    "businessName",
                    value,
                  )
                }
                placeholder="South Florida Distribution Co."
                autoFocus
                disabled={loading}
              />

              <Input
                id="contact-name"
                label="Primary Contact"
                required
                value={form.contactName}
                onChange={(value) =>
                  updateField(
                    "contactName",
                    value,
                  )
                }
                placeholder="Alex Morgan"
                disabled={loading}
              />
            </div>
          </section>

          <section className="dd-customer-modal__section">
            <div className="dd-customer-modal__section-heading">
              <span>02</span>

              <div>
                <strong>
                  Contact
                </strong>

                <p>
                  Primary business
                  communication.
                </p>
              </div>
            </div>

            <div className="dd-customer-modal__fields">
              <Input
                id="customer-phone"
                label="Phone"
                type="tel"
                required
                value={form.phone}
                onChange={(value) =>
                  updateField(
                    "phone",
                    value,
                  )
                }
                placeholder="(305) 555-0182"
                disabled={loading}
              />

              <Input
                id="location-address"
                label="Location Address"
                required
                value={
                  form.locationAddress
                }
                onChange={(value) =>
                  updateField(
                    "locationAddress",
                    value,
                  )
                }
                placeholder="123 Warehouse Blvd, Miami, FL"
                disabled={loading}
              />
            </div>
          </section>

          <footer className="dd-customer-modal__footer">
            <div className="dd-customer-modal__footer-note">
              <span />
              New customer record
            </div>

            <div className="dd-customer-modal__actions">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="dd-customer-modal__cancel"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="dd-customer-modal__submit"
              >
                {loading ? (
                  <>
                    <span className="dd-customer-modal__spinner" />
                    Creating
                  </>
                ) : (
                  <>
                    <span>+</span>
                    Create Customer
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

type InputProps = {
  id: string;
  label: string;
  value: string;
  type?: "text" | "tel";
  required?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  onChange: (
    value: string,
  ) => void;
};

function Input({
  id,
  label,
  value,
  type = "text",
  required = false,
  placeholder,
  autoFocus = false,
  disabled = false,
  onChange,
}: InputProps) {
  return (
    <div className="dd-customer-modal__field">
      <label htmlFor={id}>
        <span>
          {label}
        </span>

        {required && (
          <span className="dd-customer-modal__required">
            Required
          </span>
        )}
      </label>

      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
      />
    </div>
  );
}
