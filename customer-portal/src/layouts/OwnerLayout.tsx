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
    code: "01",
  },
  {
    label: "Orders",
    path: "/owner/orders",
    code: "03",
  },
  {
    label: "Invoices",
    path: "/owner/invoices",
    code: "04",
  },
  {
    label: "Customers",
    path: "/owner/customers",
    code: "05",
  },
  {
    label: "Inventory",
    path: "/owner/inventory",
    code: "06",
  },
  {
    label: "Receiving",
    path: "/owner/receiving",
    code: "07",
  },
];

const mobilePrimaryNavigation = [
  {
    label: "Dashboard",
    path: "/owner",
  },
  {
    label: "Orders",
    path: "/owner/orders",
  },
  {
    label: "Receive",
    path: "/owner/receiving",
    primary: true,
  },
  {
    label: "Inventory",
    path: "/owner/inventory",
  },
];

const mobileSecondaryNavigation = [
  {
    label: "Invoices",
    path: "/owner/invoices",
  },
  {
    label: "Customers",
    path: "/owner/customers",
  },
];

export default function OwnerLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [signingOut, setSigningOut] =
    useState(false);

  const [signOutError, setSignOutError] =
    useState("");

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

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
    <div className="min-h-screen bg-[var(--dd-bg)] text-[var(--dd-text)]">
      <div className="flex min-h-screen">

        {/* Desktop navigation */}
        <aside className="hidden w-72 shrink-0 border-r border-[var(--dd-border)] bg-[var(--dd-sidebar)] md:flex md:flex-col">
          <div className="border-b border-[var(--dd-border)] px-6 py-6">
            <NavLink
              to="/owner"
              className="flex items-center gap-4"
            >
              <div className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--dd-border-strong)] bg-[var(--dd-surface-raised)]">
                <span className="text-lg font-black tracking-[-0.08em] text-[var(--dd-orange)]">
                  D
                </span>

                <span className="absolute -bottom-px left-2 right-2 h-[2px] bg-[var(--dd-orange)]" />
              </div>

              <div>
                <p className="text-base font-extrabold tracking-tight text-white">
                  Distro’Dex
                </p>

                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--dd-text-muted)]">
                  Distribution OS
                </p>
              </div>
            </NavLink>
          </div>

          <div className="px-6 pt-6">
            <p className="dd-label">
              Operations
            </p>
          </div>

          <nav className="mt-3 flex-1 space-y-1 px-4">
            {ownerNavigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/owner"}
                className={({ isActive }) =>
                  [
                    "group flex items-center gap-3 rounded-lg border px-3 py-3 text-sm font-semibold transition",
                    isActive
                      ? "border-[var(--dd-border-strong)] bg-[var(--dd-surface-raised)] text-white"
                      : "border-transparent text-[var(--dd-text-secondary)] hover:border-[var(--dd-border)] hover:bg-[var(--dd-surface)] hover:text-white",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={[
                        "w-7 font-mono text-[10px] font-bold tracking-wider transition",
                        isActive
                          ? "text-[var(--dd-orange)]"
                          : "text-[var(--dd-text-muted)] group-hover:text-[var(--dd-text-secondary)]",
                      ].join(" ")}
                    >
                      {item.code}
                    </span>

                    <span className="flex-1">
                      {item.label}
                    </span>

                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--dd-orange)]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-[var(--dd-border)] p-4">
            <div className="rounded-lg border border-[var(--dd-border)] bg-[var(--dd-surface)] p-4">
              <p className="dd-label">
                Signed in
              </p>

              <p className="mt-2 break-all text-sm font-semibold text-[var(--dd-text)]">
                {user?.email ??
                  user?.username ??
                  "Authenticated user"}
              </p>

              <div className="mt-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--dd-success)]" />

                <span className="text-xs font-medium text-[var(--dd-text-secondary)]">
                  System online
                </span>
              </div>
            </div>

            {signOutError && (
              <p className="mt-3 text-sm text-red-300">
                {signOutError}
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                void handleSignOut()
              }
              disabled={signingOut}
              className="dd-button-secondary mt-3 w-full px-4 py-3 text-left text-sm disabled:opacity-50"
            >
              {signingOut
                ? "Signing out..."
                : "Sign out"}
            </button>
          </div>
        </aside>

        {/* Workspace */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-[var(--dd-border)] bg-[rgba(7,11,18,0.92)] backdrop-blur">
            <div className="flex min-h-[76px] items-center justify-between gap-5 px-5 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-4">
                <div className="md:hidden">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--dd-border-strong)] bg-[var(--dd-surface-raised)] font-black text-[var(--dd-orange)]">
                    D
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--dd-success)]" />

                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--dd-text-muted)]">
                      Live Operations
                    </p>
                  </div>

                  <p className="mt-1 truncate text-sm font-semibold text-[var(--dd-text-secondary)]">
                    Distribution command center
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-semibold text-[var(--dd-text)]">
                    Operations Workspace
                  </p>

                  <p className="mt-0.5 max-w-[230px] truncate text-xs text-[var(--dd-text-muted)]">
                    {user?.email ??
                      user?.username}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void handleSignOut()
                  }
                  disabled={signingOut}
                  className="dd-button-secondary px-3 py-2 text-xs md:hidden"
                >
                  {signingOut
                    ? "..."
                    : "Sign out"}
                </button>
              </div>
            </div>

            {signOutError && (
              <p className="px-5 pb-4 text-sm text-red-300 md:hidden sm:px-6">
                {signOutError}
              </p>
            )}

            {/* Mobile operational navigation */}
            <div className="border-t border-[var(--dd-border)] md:hidden">
              <nav className="grid grid-cols-5 bg-[var(--dd-sidebar)]">
                {mobilePrimaryNavigation.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/owner"}
                    onClick={() =>
                      setMobileMenuOpen(false)
                    }
                    className={({ isActive }) =>
                      [
                        "flex min-h-[58px] flex-col items-center justify-center border-r border-[var(--dd-border)] px-1 text-[10px] font-bold transition",
                        item.primary
                          ? isActive
                            ? "bg-[var(--dd-orange)] text-white"
                            : "bg-[var(--dd-orange-soft)] text-orange-300"
                          : isActive
                            ? "bg-[var(--dd-surface-raised)] text-white"
                            : "text-[var(--dd-text-secondary)]",
                      ].join(" ")
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={[
                            "mb-1 h-1.5 w-1.5 rounded-full",
                            item.primary
                              ? isActive
                                ? "bg-white"
                                : "bg-[var(--dd-orange)]"
                              : isActive
                                ? "bg-[var(--dd-blue)]"
                                : "bg-[var(--dd-border-strong)]",
                          ].join(" ")}
                        />

                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setMobileMenuOpen(
                      (current) => !current,
                    )
                  }
                  className={[
                    "flex min-h-[58px] flex-col items-center justify-center px-1 text-[10px] font-bold transition",
                    mobileMenuOpen
                      ? "bg-[var(--dd-surface-raised)] text-white"
                      : "text-[var(--dd-text-secondary)]",
                  ].join(" ")}
                >
                  <span className="mb-1 text-base leading-none">
                    ···
                  </span>

                  More
                </button>
              </nav>

              {mobileMenuOpen && (
                <div className="border-t border-[var(--dd-border)] bg-[var(--dd-sidebar)] p-3">
                  <div className="grid grid-cols-3 gap-2">
                    {mobileSecondaryNavigation.map(
                      (item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() =>
                            setMobileMenuOpen(false)
                          }
                          className={({ isActive }) =>
                            [
                              "rounded-lg border px-3 py-3 text-center text-xs font-semibold transition",
                              isActive
                                ? "border-[var(--dd-orange)] bg-[var(--dd-orange-soft)] text-orange-300"
                                : "border-[var(--dd-border)] bg-[var(--dd-surface)] text-[var(--dd-text-secondary)]",
                            ].join(" ")
                          }
                        >
                          {item.label}
                        </NavLink>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          </header>

          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
