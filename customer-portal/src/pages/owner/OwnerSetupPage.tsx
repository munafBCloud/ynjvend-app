import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  Navigate,
  useNavigate,
} from "react-router";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";

import {
  completeCompanyOnboarding,
  getCompany,
  type Company,
  type CompanyOnboardingInput,
} from "../../services/company";

export default function OwnerSetupPage() {
  const navigate = useNavigate();

  const [company, setCompany] =
    useState<Company | null>(null);

  const [form, setForm] =
    useState<CompanyOnboardingInput>({
      businessName: "",
      primaryContactName: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
    });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCompany() {
      try {
        setLoading(true);
        setError("");

        const loadedCompany = await getCompany();

        if (!active) {
          return;
        }

        setCompany(loadedCompany);

        setForm({
          businessName:
            loadedCompany.businessName ?? "",
          primaryContactName:
            loadedCompany.primaryContactName ?? "",
          phone: loadedCompany.phone ?? "",
          address: loadedCompany.address ?? "",
          city: loadedCompany.city ?? "",
          state: loadedCompany.state ?? "",
          postalCode:
            loadedCompany.postalCode ?? "",
        });
      } catch (loadError) {
        console.error(
          "Unable to load company setup:",
          loadError,
        );

        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load company setup.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCompany();

    return () => {
      active = false;
    };
  }, []);

  function updateField(
    field: keyof CompanyOnboardingInput,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !form.businessName.trim() ||
      !form.primaryContactName.trim()
    ) {
      setError(
        "Business name and primary contact name are required.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await completeCompanyOnboarding({
        businessName: form.businessName.trim(),
        primaryContactName:
          form.primaryContactName.trim(),
        phone: form.phone?.trim() || "",
        address: form.address?.trim() || "",
        city: form.city?.trim() || "",
        state: form.state?.trim() || "",
        postalCode:
          form.postalCode?.trim() || "",
      });

      navigate("/owner", {
        replace: true,
      });
    } catch (saveError) {
      console.error(
        "Unable to complete company setup:",
        saveError,
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to complete company setup.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--dd-bg)] px-5 py-10 text-[var(--dd-text)]">
        <div className="mx-auto max-w-3xl">
          <LoadingState message="Loading company setup..." />
        </div>
      </main>
    );
  }

  if (!company) {
    return (
      <main className="min-h-screen bg-[var(--dd-bg)] px-5 py-10 text-[var(--dd-text)]">
        <div className="mx-auto max-w-3xl">
          <ErrorMessage
            title="Unable to load company"
            message={
              error ||
              "Your company profile could not be loaded."
            }
          />
        </div>
      </main>
    );
  }

  if (company.onboardingStatus === "complete") {
    return <Navigate to="/owner" replace />;
  }

  return (
    <main className="min-h-screen bg-[var(--dd-bg)] px-5 py-8 text-[var(--dd-text)] sm:px-6 lg:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--dd-border-strong)] bg-[var(--dd-surface-raised)] font-black text-[var(--dd-orange)]">
              D
            </div>

            <div>
              <p className="font-extrabold text-white">
                Distro&apos;Dex
              </p>

              <p className="text-xs text-[var(--dd-text-muted)]">
                Founding Beta
              </p>
            </div>
          </div>

          <div className="mt-10">
            <p className="dd-label">
              Company setup
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Set up your workspace
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--dd-text-secondary)] sm:text-base">
              Confirm your company information before
              entering the Distro&apos;Dex operations
              workspace.
            </p>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-5 sm:p-7"
        >
          {error && (
            <div className="mb-6">
              <ErrorMessage
                title="Unable to complete setup"
                message={error}
              />
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="dd-label">
                Business name
              </span>

              <input
                type="text"
                required
                maxLength={120}
                value={form.businessName}
                onChange={(event) =>
                  updateField(
                    "businessName",
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-lg border border-[var(--dd-border)] bg-[var(--dd-bg)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--dd-orange)]"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="dd-label">
                Primary contact
              </span>

              <input
                type="text"
                required
                maxLength={120}
                value={form.primaryContactName}
                onChange={(event) =>
                  updateField(
                    "primaryContactName",
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-lg border border-[var(--dd-border)] bg-[var(--dd-bg)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--dd-orange)]"
              />
            </label>

            <label>
              <span className="dd-label">
                Phone
              </span>

              <input
                type="tel"
                maxLength={40}
                value={form.phone}
                onChange={(event) =>
                  updateField(
                    "phone",
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-lg border border-[var(--dd-border)] bg-[var(--dd-bg)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--dd-orange)]"
              />
            </label>

            <label>
              <span className="dd-label">
                Postal code
              </span>

              <input
                type="text"
                maxLength={20}
                value={form.postalCode}
                onChange={(event) =>
                  updateField(
                    "postalCode",
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-lg border border-[var(--dd-border)] bg-[var(--dd-bg)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--dd-orange)]"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="dd-label">
                Address
              </span>

              <input
                type="text"
                maxLength={200}
                value={form.address}
                onChange={(event) =>
                  updateField(
                    "address",
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-lg border border-[var(--dd-border)] bg-[var(--dd-bg)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--dd-orange)]"
              />
            </label>

            <label>
              <span className="dd-label">
                City
              </span>

              <input
                type="text"
                maxLength={100}
                value={form.city}
                onChange={(event) =>
                  updateField(
                    "city",
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-lg border border-[var(--dd-border)] bg-[var(--dd-bg)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--dd-orange)]"
              />
            </label>

            <label>
              <span className="dd-label">
                State
              </span>

              <input
                type="text"
                maxLength={100}
                value={form.state}
                onChange={(event) =>
                  updateField(
                    "state",
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-lg border border-[var(--dd-border)] bg-[var(--dd-bg)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--dd-orange)]"
              />
            </label>
          </div>

          <div className="mt-8 border-t border-[var(--dd-border)] pt-6">
            <button
              type="submit"
              disabled={saving}
              className="dd-button-primary w-full px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving
                ? "Setting up workspace..."
                : "Complete setup"}
            </button>

            <p className="mt-4 text-xs leading-5 text-[var(--dd-text-muted)]">
              Your account, plan, access role, and tenant
              identity are managed securely by
              Distro&apos;Dex and cannot be changed from
              this form.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
