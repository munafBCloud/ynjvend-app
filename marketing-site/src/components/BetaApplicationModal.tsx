import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type BetaApplicationModalProps = {
  open: boolean;
  onClose: () => void;
};

type FormState = {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  distributionType: string;
  skuRange: string;
  teamSize: string;
  currentSystem: string;
  biggestProblem: string;
  notes: string;
  website: string;
};

const initialForm: FormState = {
  businessName: "",
  contactName: "",
  email: "",
  phone: "",
  distributionType: "",
  skuRange: "",
  teamSize: "",
  currentSystem: "",
  biggestProblem: "",
  notes: "",
  website: "",
};

export default function BetaApplicationModal({
  open,
  onClose,
}: BetaApplicationModalProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  const updateField = (
    field: keyof FormState,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

    if (!apiBaseUrl) {
      setError("Application service is not configured.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/beta-applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          typeof data?.message === "string"
            ? data.message
            : "Unable to submit application.",
        );
        return;
      }

      setSubmitted(true);
      setForm(initialForm);
    } catch {
      setError("Unable to connect to the application service.");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setError("");
    setSubmitted(false);
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="beta-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
    >
      <section
        className="beta-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="beta-modal-title"
      >
        <button
          className="beta-modal-close"
          type="button"
          onClick={closeModal}
          aria-label="Close beta application"
        >
          ×
        </button>

        {!submitted ? (
          <>
            <div className="beta-modal-heading">
              <span>FOUNDING BETA / APPLICATION</span>

              <h2 id="beta-modal-title">
                Tell us about your distribution operation.
              </h2>

              <p>
                We’re selecting early distributors who can help validate
                Distro&apos;Dex across real inventory, order, customer, invoice,
                and receiving workflows.
              </p>
            </div>

            <form className="beta-application-form" onSubmit={handleSubmit}>
              <div
                className="beta-form-honeypot"
                aria-hidden="true"
              >
                <label>
                  <span>Website</span>
                  <input
                    type="text"
                    name="website"
                    value={form.website}
                    onChange={(event) =>
                      updateField("website", event.target.value)
                    }
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>
              </div>

              <div className="beta-form-grid">
                <label>
                  <span>Business name *</span>
                  <input
                    required
                    maxLength={120}
                    value={form.businessName}
                    onChange={(event) =>
                      updateField("businessName", event.target.value)
                    }
                    autoComplete="organization"
                  />
                </label>

                <label>
                  <span>Contact name *</span>
                  <input
                    required
                    maxLength={100}
                    value={form.contactName}
                    onChange={(event) =>
                      updateField("contactName", event.target.value)
                    }
                    autoComplete="name"
                  />
                </label>

                <label>
                  <span>Email *</span>
                  <input
                    required
                    type="email"
                    maxLength={254}
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    autoComplete="email"
                  />
                </label>

                <label>
                  <span>Phone</span>
                  <input
                    maxLength={40}
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                    autoComplete="tel"
                  />
                </label>

                <label>
                  <span>Distribution type *</span>
                  <select
                    required
                    value={form.distributionType}
                    onChange={(event) =>
                      updateField("distributionType", event.target.value)
                    }
                  >
                    <option value="">Select one</option>
                    <option value="Independent wholesale distributor">
                      Independent wholesale distributor
                    </option>
                    <option value="Local distributor">
                      Local distributor
                    </option>
                    <option value="Regional distributor">
                      Regional distributor
                    </option>
                    <option value="Specialty distributor">
                      Specialty distributor
                    </option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label>
                  <span>Approximate SKU count</span>
                  <select
                    value={form.skuRange}
                    onChange={(event) =>
                      updateField("skuRange", event.target.value)
                    }
                  >
                    <option value="">Select range</option>
                    <option value="Under 100">Under 100</option>
                    <option value="100-500">100–500</option>
                    <option value="500-1000">500–1,000</option>
                    <option value="1000-5000">1,000–5,000</option>
                    <option value="5000+">5,000+</option>
                  </select>
                </label>

                <label>
                  <span>Team size</span>
                  <select
                    value={form.teamSize}
                    onChange={(event) =>
                      updateField("teamSize", event.target.value)
                    }
                  >
                    <option value="">Select size</option>
                    <option value="1">1</option>
                    <option value="2-5">2–5</option>
                    <option value="6-10">6–10</option>
                    <option value="11-25">11–25</option>
                    <option value="26+">26+</option>
                  </select>
                </label>

                <label>
                  <span>Current system *</span>
                  <select
                    required
                    value={form.currentSystem}
                    onChange={(event) =>
                      updateField("currentSystem", event.target.value)
                    }
                  >
                    <option value="">Select one</option>
                    <option value="Spreadsheets">Spreadsheets</option>
                    <option value="Inventory software">
                      Inventory software
                    </option>
                    <option value="ERP">ERP</option>
                    <option value="Multiple disconnected tools">
                      Multiple disconnected tools
                    </option>
                    <option value="Mostly manual">Mostly manual</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>

              <label className="beta-form-wide">
                <span>Biggest operational problem *</span>
                <textarea
                  required
                  maxLength={1000}
                  rows={4}
                  value={form.biggestProblem}
                  onChange={(event) =>
                    updateField("biggestProblem", event.target.value)
                  }
                  placeholder="What creates the most friction in your operation today?"
                />
              </label>

              <label className="beta-form-wide">
                <span>Anything else we should know?</span>
                <textarea
                  maxLength={2000}
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    updateField("notes", event.target.value)
                  }
                />
              </label>

              {error && (
                <div className="beta-form-error" role="alert">
                  <span>!</span>
                  {error}
                </div>
              )}

              <div className="beta-form-footer">
                <span>
                  Required fields are marked with *
                </span>

                <button
                  className="button button-primary animated-cta beta-submit-button"
                  type="submit"
                  disabled={submitting}
                >
                  <span>
                    {submitting
                      ? "Submitting..."
                      : "Submit Application"}
                  </span>

                  <i aria-hidden="true">→</i>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="beta-success">
            <div className="beta-success-icon">✓</div>

            <span>APPLICATION RECEIVED</span>

            <h2>You're in the review queue.</h2>

            <p>
              Thanks for your interest in Distro&apos;Dex. We&apos;ll review
              your operation and follow up using the contact information you
              submitted.
            </p>

            <button
              className="button button-secondary"
              type="button"
              onClick={closeModal}
            >
              Return to Distro&apos;Dex
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
