import { useState, type FormEvent } from "react";
import {
  Link,
  Navigate,
  useLocation,
} from "react-router";

import { useAuth } from "../../auth/useAuth";

export default function LoginPage() {
  const { signIn, isAuthenticated } = useAuth();
  const location = useLocation();

  const locationState = location.state as {
    from?: { pathname: string };
    passwordResetSuccess?: boolean;
  } | null;

  const from =
    locationState?.from?.pathname ??
    "/owner";

  const passwordResetSuccess =
    locationState?.passwordResetSuccess === true;

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      await signIn(email, password);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dd-login">
      <div
        className="dd-login__grid"
        aria-hidden="true"
      />

      <div
        className="dd-login__glow dd-login__glow--orange"
        aria-hidden="true"
      />

      <div
        className="dd-login__glow dd-login__glow--blue"
        aria-hidden="true"
      />

      <header className="dd-login__brand">
        <Link
          to="/login"
          className="dd-login__brand-link"
          aria-label="Distro'Dex sign in"
        >
          <span
            className="dd-login__brand-mark"
            aria-hidden="true"
          >
            D
          </span>

          <span className="dd-login__brand-copy">
            <span className="dd-login__brand-name">
              Distro&apos;Dex
            </span>

            <span className="dd-login__brand-subtitle">
              Distribution Operations
            </span>
          </span>
        </Link>

        <div className="dd-login__beta">
          <span
            className="dd-login__beta-dot"
            aria-hidden="true"
          />
          Founding Beta
        </div>
      </header>

      <section className="dd-login__content">
        <div className="dd-login__intro">
          <div className="dd-login__eyebrow">
            Operations Console
          </div>

          <h1>
            Run distribution
            <span> from one system.</span>
          </h1>

          <p>
            Inventory, customers, orders,
            invoices, and receiving connected
            in one operational workspace.
          </p>

          <div
            className="dd-login__operations"
            aria-label="Distro'Dex capabilities"
          >
            <span>Inventory</span>
            <span>Orders</span>
            <span>Receiving</span>
            <span>Invoices</span>
          </div>
        </div>

        <div className="dd-login__panel">
          <div className="dd-login__panel-header">
            <div>
              <div className="dd-login__panel-kicker">
                Secure Access
              </div>

              <h2>Welcome back</h2>

              <p>
                Sign in to your Distro&apos;Dex
                workspace.
              </p>
            </div>

            <div
              className="dd-login__status"
              title="Operations available"
            >
              <span aria-hidden="true" />
              Live
            </div>
          </div>

          {passwordResetSuccess && (
            <div
              className="dd-login__notice dd-login__notice--success"
              role="status"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M20 6 9 17l-5-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <span>
                Password reset successfully.
                You can now sign in.
              </span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="dd-login__form"
          >
            <div className="dd-login__field">
              <label htmlFor="login-email">
                Email address
              </label>

              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                placeholder="you@company.com"
                required
                disabled={loading}
              />
            </div>

            <div className="dd-login__field">
              <div className="dd-login__field-row">
                <label htmlFor="login-password">
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="dd-login__forgot"
                >
                  Forgot password?
                </Link>
              </div>

              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div
                className="dd-login__notice dd-login__notice--error"
                role="alert"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 7v6M12 17h.01"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>

                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="dd-login__submit"
            >
              <span>
                {loading
                  ? "Signing in..."
                  : "Sign in"}
              </span>

              {!loading && (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}

              {loading && (
                <span
                  className="dd-login__spinner"
                  aria-hidden="true"
                />
              )}
            </button>
          </form>

          <div className="dd-login__panel-footer">
            <span
              className="dd-login__secure-icon"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24">
                <rect
                  x="5"
                  y="10"
                  width="14"
                  height="10"
                  rx="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M8 10V7a4 4 0 0 1 8 0v3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            Secure access to your company
            workspace
          </div>
        </div>
      </section>

      <footer className="dd-login__footer">
        <span>
          DISTRO&apos;DEX / OPERATIONS PLATFORM
        </span>

        <span className="dd-login__footer-version">
          FOUNDING BETA
        </span>
      </footer>
    </main>
  );
}
