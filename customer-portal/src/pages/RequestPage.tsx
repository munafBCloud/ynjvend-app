import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router";

type RequestForm = {
  businessName: string;
  contactName: string;
  phone: string;
  locationAddress: string;
  quantity: string;
  notes: string;
};

type Customer = {
  customerId: string;
  businessName: string;
  contactName: string;
  phone: string;
  locationAddress: string;
};

type CustomerApiResponse = {
  message: string;
  customer: Customer;
};

type ProductRequest = {
  requestId: string;
  customerId: string;
  businessName: string;
  productId: string;
  productName: string;
  quantityRequested: number;
  status: string;
  requestedAt: string;
};

type RequestApiResponse = {
  message: string;
  request: ProductRequest;
};

type ApiErrorResponse = {
  message?: string;
  fields?: string[];
};

const API_BASE_URL =
  "https://ra280rph8l.execute-api.us-east-1.amazonaws.com";

export default function RequestPage() {
  const [searchParams] = useSearchParams();

  const productId = searchParams.get("productId") ?? "";
  const productName = searchParams.get("productName") ?? "";

  const [form, setForm] = useState<RequestForm>({
    businessName: "",
    contactName: "",
    phone: "",
    locationAddress: "",
    quantity: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [requestId, setRequestId] = useState("");

  function updateField(field: keyof RequestForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function readApiError(response: Response) {
    try {
      const errorData = (await response.json()) as ApiErrorResponse;

      if (errorData.fields?.length) {
        return `${errorData.message ?? "Request failed"}: ${errorData.fields.join(
          ", "
        )}`;
      }

      return errorData.message ?? `Request failed with status ${response.status}`;
    } catch {
      return `Request failed with status ${response.status}`;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!productId || !productName) {
      setSubmissionError(
        "No product was selected. Return to the Products page and choose a product."
      );
      return;
    }

    const quantityRequested = Number(form.quantity);

    if (
      !Number.isInteger(quantityRequested) ||
      quantityRequested < 1 ||
      quantityRequested > 1000
    ) {
      setSubmissionError(
        "Requested quantity must be a whole number between 1 and 1000."
      );
      return;
    }

    setSubmitting(true);
    setSubmissionError("");

    try {
      const customerResponse = await fetch(`${API_BASE_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          contactName: form.contactName.trim(),
          phone: form.phone.trim(),
          locationAddress: form.locationAddress.trim(),
        }),
      });

      if (!customerResponse.ok) {
        throw new Error(await readApiError(customerResponse));
      }

      const customerData =
        (await customerResponse.json()) as CustomerApiResponse;

      if (!customerData.customer?.customerId) {
        throw new Error(
          "The customer was created, but no customer ID was returned."
        );
      }

      const requestResponse = await fetch(`${API_BASE_URL}/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: customerData.customer.customerId,
          businessName: form.businessName.trim(),
          productId,
          productName,
          quantityRequested,
        }),
      });

      if (!requestResponse.ok) {
        throw new Error(await readApiError(requestResponse));
      }

      const requestData =
        (await requestResponse.json()) as RequestApiResponse;

      if (!requestData.request?.requestId) {
        throw new Error(
          "The request was submitted, but no request ID was returned."
        );
      }

      setRequestId(requestData.request.requestId);
    } catch (error) {
      console.error("Unable to submit product request:", error);

      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Unable to submit the request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (requestId) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            Request submitted
          </p>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Thank you, {form.contactName}
          </h1>

          <p className="mt-4 text-slate-700">
            Your request for {productName} was successfully submitted.
          </p>

          <div className="mt-6 rounded-xl border border-green-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-500">Request ID</p>

            <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-950">
              {requestId}
            </p>
          </div>

          <p className="mt-6 text-slate-700">
            YNJ Vend will review your request and contact your business shortly.
          </p>

          <Link
            to="/products"
            className="mt-8 inline-block rounded-xl bg-red-700 px-6 py-3 font-semibold text-white transition hover:bg-red-800"
          >
            Return to Products
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
        Product request
      </p>

      <h1 className="mt-3 text-4xl font-bold text-slate-950">
        Request Inventory
      </h1>

      <p className="mt-4 text-slate-600">
        Submit your business information and requested quantity below.
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-semibold text-slate-500">
          Selected product
        </p>

        <p className="mt-1 text-xl font-bold text-slate-950">
          {productName || "No product selected"}
        </p>

        {productId && (
          <p className="mt-1 text-sm text-slate-500">
            Product ID: {productId}
          </p>
        )}

        {!productId && (
          <Link
            to="/products"
            className="mt-4 inline-block font-semibold text-red-700 hover:text-red-800"
          >
            Select a product
          </Link>
        )}
      </div>

      {submissionError && (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5"
        >
          <p className="font-semibold text-red-700">Submission failed</p>
          <p className="mt-1 text-red-700">{submissionError}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div>
          <label
            htmlFor="businessName"
            className="block font-semibold text-slate-800"
          >
            Business name
          </label>

          <input
            id="businessName"
            type="text"
            required
            maxLength={150}
            value={form.businessName}
            onChange={(event) =>
              updateField("businessName", event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700"
          />
        </div>

        <div>
          <label
            htmlFor="contactName"
            className="block font-semibold text-slate-800"
          >
            Contact name
          </label>

          <input
            id="contactName"
            type="text"
            required
            maxLength={100}
            value={form.contactName}
            onChange={(event) =>
              updateField("contactName", event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block font-semibold text-slate-800"
          >
            Phone number
          </label>

          <input
            id="phone"
            type="tel"
            required
            maxLength={30}
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700"
          />
        </div>

        <div>
          <label
            htmlFor="locationAddress"
            className="block font-semibold text-slate-800"
          >
            Business address
          </label>

          <input
            id="locationAddress"
            type="text"
            required
            maxLength={300}
            value={form.locationAddress}
            onChange={(event) =>
              updateField("locationAddress", event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700"
          />
        </div>

        <div>
          <label
            htmlFor="quantity"
            className="block font-semibold text-slate-800"
          >
            Requested quantity
          </label>

          <input
            id="quantity"
            type="number"
            min="1"
            max="1000"
            step="1"
            required
            value={form.quantity}
            onChange={(event) => updateField("quantity", event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700"
          />
        </div>

        <div>
          <label
            htmlFor="notes"
            className="block font-semibold text-slate-800"
          >
            Notes
          </label>

          <textarea
            id="notes"
            rows={4}
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Special instructions or delivery details"
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-700"
          />

          <p className="mt-2 text-sm text-slate-500">
            Notes are currently kept in the form only and are not yet stored in
            the backend.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting || !productId}
          className="w-full rounded-xl bg-red-700 py-3 font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? "Submitting Request..." : "Submit Request"}
        </button>
      </form>
    </section>
  );
}
