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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-red-700">
            YNJ Vend
          </h1>

          <p className="mt-2 text-slate-500">
            Reset your password
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="reset-email"
              className="mb-2 block text-sm font-semibold"
            >
              Email
            </label>

            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
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
              ? "Sending Code..."
              : "Send Reset Code"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm font-semibold text-red-700 hover:text-red-800"
          >
            Return to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
