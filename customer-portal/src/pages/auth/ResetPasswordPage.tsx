import { useState, type FormEvent } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router";

import { useAuth } from "../../auth/useAuth";

type ResetPasswordLocationState = {
  email?: string;
};

export default function ResetPasswordPage() {
  const {
    confirmPasswordReset,
    requestPasswordReset,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const state =
    location.state as ResetPasswordLocationState | null;

  const email =
    state?.email?.trim().toLowerCase() ?? "";

  const [confirmationCode, setConfirmationCode] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmNewPassword, setConfirmNewPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] =
    useState("");

  if (!email) {
    return (
      <Navigate
        to="/forgot-password"
        replace
      />
    );
  }

  async function handleResendCode() {
    if (resending || loading) {
      return;
    }

    try {
      setResending(true);
      setError("");
      setResendMessage("");

      await requestPasswordReset(email);

      setConfirmationCode("");
      setResendMessage(
        "A new verification code was requested. " +
          "Use the newest code you receive.",
      );
    } catch (resetError) {
      console.error(
        "Unable to resend password reset code:",
        resetError,
      );

      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to send a new verification code.",
      );
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const normalizedCode =
      confirmationCode.trim();

    if (!normalizedCode) {
      setError("Enter the verification code.");
      return;
    }

    if (!newPassword) {
      setError("Enter a new password.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await confirmPasswordReset(
        email,
        normalizedCode,
        newPassword,
      );

      navigate("/login", {
        replace: true,
        state: {
          passwordResetSuccess: true,
        },
      });
    } catch (resetError) {
      console.error(
        "Unable to confirm password reset:",
        resetError,
      );

      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to reset password.",
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
                Verification
              </div>

              <h2>Create new password</h2>

              <p>
                Enter the verification code and choose
                a new password for your workspace.
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

          <div className="dd-auth__destination">
            <span>Code sent to</span>
            <strong>{email}</strong>
          </div>

          <form
            onSubmit={handleSubmit}
            className="dd-login__form"
          >
            <div className="dd-login__field">
              <label htmlFor="confirmation-code">
                Verification code
              </label>

              <input
                id="confirmation-code"
                type="text"
                inputMode="numeric"
                value={confirmationCode}
                onChange={(event) =>
                  setConfirmationCode(
                    event.target.value,
                  )
                }
                autoComplete="one-time-code"
                placeholder="Enter verification code"
                required
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="dd-login__field">
              <label htmlFor="new-password">
                New password
              </label>

              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(
                    event.target.value,
                  )
                }
                autoComplete="new-password"
                placeholder="Enter new password"
                required
                disabled={loading}
              />
            </div>

            <div className="dd-login__field">
              <label htmlFor="confirm-new-password">
                Confirm new password
              </label>

              <input
                id="confirm-new-password"
                type="password"
                value={confirmNewPassword}
                onChange={(event) =>
                  setConfirmNewPassword(
                    event.target.value,
                  )
                }
                autoComplete="new-password"
                placeholder="Re-enter new password"
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
                  ? "Resetting password..."
                  : "Reset password"}
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

          {resendMessage && (
            <div
              className="dd-login__notice"
              role="status"
            >
              <span>{resendMessage}</span>
            </div>
          )}

          <div className="dd-auth__actions">
            <button
              type="button"
              className="dd-auth__back"
              onClick={() => {
                void handleResendCode();
              }}
              disabled={resending || loading}
            >
              <span aria-hidden="true">←</span>
              {resending
                ? "Requesting new code..."
                : "Request a new code"}
            </button>
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

            Your new password is applied to your
            Distro&apos;Dex account
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
