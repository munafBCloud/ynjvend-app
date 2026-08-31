import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";

import { useAuth } from "../../auth/useAuth";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter your email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await requestPasswordReset(normalizedEmail);

      navigate("/reset-password", {
        state: {
          email: normalizedEmail,
        },
      });
    } catch (resetError) {
      console.error(
        "Unable to request password reset:",
        resetError,
      );

      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to send a password reset code.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dd-login dd-auth">
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

      <section className="dd-auth__content">
        <div className="dd-login__panel dd-auth__panel">
          <div className="dd-login__panel-header">
            <div>
              <div className="dd-login__panel-kicker">
                Account Recovery
              </div>

              <h2>Reset your password</h2>

              <p>
                Enter the email associated with your
                Distro&apos;Dex workspace.
              </p>
            </div>

            <div
              className="dd-login__status"
              title="Secure account recovery"
            >
              <span aria-hidden="true" />
              Secure
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="dd-login__form"
          >
            <div className="dd-login__field">
              <label htmlFor="reset-email">
                Email address
              </label>

              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                placeholder="you@company.com"
                required
                disabled={loading}
                autoFocus
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
                  ? "Sending code..."
                  : "Send reset code"}
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

          <div className="dd-auth__actions">
            <Link
              to="/login"
              className="dd-auth__back"
            >
              <span aria-hidden="true">←</span>
              Return to sign in
            </Link>
          </div>

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

            Verification codes are delivered through
            your secure account recovery channel
          </div>
        </div>
      </section>

      <footer className="dd-login__footer">
        <span>
          DISTRO&apos;DEX / ACCOUNT RECOVERY
        </span>

        <span className="dd-login__footer-version">
          FOUNDING BETA
        </span>
      </footer>
    </main>
  );
}
