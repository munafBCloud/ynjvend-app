import { useState, type FormEvent } from "react";

import type { CreateCustomerInput } from "../types/customer";

type CustomerModalProps = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onCreate: (customer: CreateCustomerInput) => Promise<void>;
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
  const [form, setForm] = useState<CreateCustomerInput>(EMPTY_FORM);
  const [error, setError] = useState("");

  if (!open) {
    return null;
  }

  function updateField<K extends keyof CreateCustomerInput>(
    key: K,
    value: CreateCustomerInput[K],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (
      !form.businessName.trim() ||
      !form.contactName.trim() ||
      !form.phone.trim() ||
      !form.locationAddress.trim()
    ) {
      setError("Please complete all required fields.");
      return;
    }

    try {
      await onCreate({
        businessName: form.businessName.trim(),
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        locationAddress: form.locationAddress.trim(),
      });

      setForm(EMPTY_FORM);
      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-customer-title"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="add-customer-title"
              className="text-2xl font-bold text-slate-900"
            >
              Add Customer
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Create a new business customer.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close customer form"
            className="rounded-lg px-3 py-2 text-xl font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <Input
            id="business-name"
            label="Business Name"
            required
            value={form.businessName}
            onChange={(value) => updateField("businessName", value)}
          />

          <Input
            id="contact-name"
            label="Contact Name"
            required
            value={form.contactName}
            onChange={(value) => updateField("contactName", value)}
          />

          <Input
            id="customer-phone"
            label="Phone"
            type="tel"
            required
            value={form.phone}
            onChange={(value) => updateField("phone", value)}
          />

          <Input
            id="location-address"
            label="Location Address"
            required
            value={form.locationAddress}
            onChange={(value) => updateField("locationAddress", value)}
          />

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">
                {error}
              </p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Customer"}
            </button>
          </div>
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
  onChange: (value: string) => void;
};

function Input({
  id,
  label,
  value,
  type = "text",
  required = false,
  onChange,
}: InputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-slate-700"
      >
        {label}
        {required && <span className="text-red-700"> *</span>}
      </label>

      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
      />
    </div>
  );
}
