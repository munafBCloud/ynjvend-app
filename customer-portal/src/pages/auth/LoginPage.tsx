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
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      await signIn(email, password);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in."
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
            Owner Portal
          </p>
        </div>

        {passwordResetSuccess && (
          <div className="mb-5 rounded-lg bg-green-100 p-3 text-sm text-green-800">
            Password reset successfully. You can now sign in.
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              className="w-full rounded-lg border p-3"
              required
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label className="block text-sm font-semibold">
                Password
              </label>

              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-red-700 hover:text-red-800"
              >
                Forgot password?
              </Link>
            </div>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
              className="w-full rounded-lg border p-3"
              required
            />
          </div>

          {error && (
            <div className="rounded bg-red-100 p-3 text-red-700">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-red-700 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
