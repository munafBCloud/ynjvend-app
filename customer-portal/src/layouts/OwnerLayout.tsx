import { useState } from "react";
import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router";

import { useAuth } from "../auth/useAuth";

const ownerNavigation = [
  {
    label: "Dashboard",
    path: "/owner",
  },
  {
    label: "Analytics",
    path: "/owner/analytics",
  },
  {
    label: "Orders",
    path: "/owner/orders",
  },
  {
    label: "Invoices",
    path: "/owner/invoices",
  },
  {
    label: "Customers",
    path: "/owner/customers",
  },
  {
    label: "Inventory",
    path: "/owner/inventory",
  },
];

export default function OwnerLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [signingOut, setSigningOut] =
    useState(false);

  const [signOutError, setSignOutError] =
    useState("");

  async function handleSignOut() {
    try {
      setSigningOut(true);
      setSignOutError("");

      await signOut();

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Unable to sign out:",
        error,
      );

      setSignOutError(
        error instanceof Error
          ? error.message
          : "Unable to sign out. Please try again.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col bg-slate-950 text-white md:flex">
          <div className="border-b border-slate-800 px-6 py-6">
            <NavLink
              to="/owner"
              className="flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-700 font-bold">
                YNJ
              </div>

              <div>
                <p className="font-bold">
                  YNJ Vend
                </p>

                <p className="text-xs text-slate-400">
                  Owner Portal
                </p>
              </div>
            </NavLink>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            {ownerNavigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/owner"}
                className={({ isActive }) =>
                  [
                    "block rounded-lg px-4 py-3 text-sm font-semibold transition",
                    isActive
                      ? "bg-red-700 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-slate-800 p-4">
            <div className="mb-4 rounded-lg bg-slate-900 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Signed in as
              </p>

              <p className="mt-1 break-all text-sm font-semibold text-white">
                {user?.email ??
                  user?.username ??
                  "Authenticated user"}
              </p>
            </div>

            {signOutError && (
              <p className="mb-3 text-sm text-red-300">
                {signOutError}
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                void handleSignOut()
              }
              disabled={signingOut}
              className="w-full rounded-lg bg-red-700 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingOut
                ? "Signing Out..."
                : "Sign Out"}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-4 px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
                  Owner Portal
                </p>

                <h1 className="text-xl font-bold text-slate-950">
                  Business Operations
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  {user?.email ??
                    user?.username}
                </p>
              </div>

              <div className="md:hidden">
                <button
                  type="button"
                  onClick={() =>
                    void handleSignOut()
                  }
                  disabled={signingOut}
                  className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                >
                  {signingOut
                    ? "Signing Out..."
                    : "Sign Out"}
                </button>
              </div>
            </div>

            {signOutError && (
              <p className="px-6 pb-4 text-sm text-red-700 md:hidden">
                {signOutError}
              </p>
            )}
          </header>

          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
