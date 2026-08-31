import type { ReactNode } from "react";
import {
  Navigate,
  useLocation,
} from "react-router";

import { useAuth } from "./useAuth";

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const { isAuthenticated, loading } =
    useAuth();

  const location = useLocation();

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

          <span>Checking secure session...</span>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}
