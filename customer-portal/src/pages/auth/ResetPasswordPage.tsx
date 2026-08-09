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
  const { confirmPasswordReset } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const state =
    location.state as ResetPasswordLocationState | null;

  const email = state?.email?.trim().toLowerCase() ?? "";

  const [confirmationCode, setConfirmationCode] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmNewPassword, setConfirmNewPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!email) {
    return (
      <Navigate
        to="/forgot-password"
        replace
      />
    );
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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-red-700">
            YNJ Vend
          </h1>

          <p className="mt-2 text-slate-500">
            Enter your verification code
          </p>

          <p className="mt-2 text-sm text-slate-400">
            Code sent to {email}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="confirmation-code"
              className="mb-2 block text-sm font-semibold"
            >
              Verification Code
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
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
              required
            />
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="mb-2 block text-sm font-semibold"
            >
              New Password
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
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
              required
            />
          </div>

          <div>
            <label
              htmlFor="confirm-new-password"
              className="mb-2 block text-sm font-semibold"
            >
              Confirm New Password
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
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
              required
            />
          </div>

          {error && (
            <div
              className="rounded-lg bg-red-100 p-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-red-700 py-3 font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Resetting Password..."
              : "Reset Password"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-red-700 hover:text-red-800"
          >
            Request a new code
          </Link>
        </div>
      </div>
    </div>
  );
}
