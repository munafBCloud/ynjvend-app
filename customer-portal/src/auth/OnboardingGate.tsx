import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  Navigate,
  useLocation,
} from "react-router";

import {
  getCompany,
  type Company,
} from "../services/company";

type OnboardingGateProps = {
  children: ReactNode;
};

export default function OnboardingGate({
  children,
}: OnboardingGateProps) {
  const location = useLocation();

  const [company, setCompany] =
    useState<Company | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCompany() {
      try {
        setLoading(true);
        setError("");

        const loadedCompany = await getCompany();

        if (active) {
          setCompany(loadedCompany);
        }
      } catch (loadError) {
        console.error(
          "Unable to load company onboarding state:",
          loadError,
        );

        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your company profile.",
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

  if (loading) {
    return (
      <main
        className="dd-session-check"
        role="status"
        aria-live="polite"
      >
        <div className="dd-session-check__brand">
          <span
            className="dd-session-check__mark"
            aria-hidden="true"
          >
            D
          </span>

          <div>
            <strong>Distro&apos;Dex</strong>
            <span>Distribution Operations</span>
          </div>
        </div>

        <div className="dd-session-check__status">
          <span
            className="dd-session-check__spinner"
            aria-hidden="true"
          />
          <span>Loading company workspace...</span>
        </div>
      </main>
    );
  }

  if (error || !company) {
    return (
      <main className="dd-session-check">
        <div className="max-w-lg rounded-xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-6">
          <p className="dd-label">
            Workspace unavailable
          </p>

          <h1 className="mt-3 text-xl font-bold text-white">
            We couldn&apos;t load your company.
          </h1>

          <p className="mt-3 text-sm text-[var(--dd-text-secondary)]">
            {error ||
              "Your company profile could not be loaded."}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="dd-button-secondary mt-5 px-4 py-3 text-sm"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (company.onboardingStatus !== "complete") {
    return (
      <Navigate
        to="/owner/setup"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return children;
}
