import { Navigate, Route, Routes } from "react-router";

import ProtectedRoute from "./auth/ProtectedRoute";
import OwnerLayout from "./layouts/OwnerLayout";

import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import LoginPage from "./pages/auth/LoginPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

import OwnerAnalyticsPage from "./pages/owner/OwnerAnalyticsPage";
import OwnerCustomersPage from "./pages/owner/OwnerCustomersPage";
import OwnerDashboardPage from "./pages/owner/OwnerDashboardPage";
import OwnerInventoryPage from "./pages/owner/OwnerInventoryPage";
import OwnerInvoicesPage from "./pages/owner/OwnerInvoicesPage";
import OwnerOrdersPage from "./pages/owner/OwnerOrdersPage";
import OwnerReceivingPage from "./pages/owner/OwnerReceivingPage";

import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/owner" replace />}
      />

      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/forgot-password"
        element={<ForgotPasswordPage />}
      />

      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />

      <Route
        path="/owner"
        element={
          <ProtectedRoute>
            <OwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OwnerDashboardPage />} />

        <Route
          path="analytics"
          element={<OwnerAnalyticsPage />}
        />

        <Route
          path="orders"
          element={<OwnerOrdersPage />}
        />

        <Route
          path="invoices"
          element={<OwnerInvoicesPage />}
        />

        <Route
          path="customers"
          element={<OwnerCustomersPage />}
        />

        <Route
          path="inventory"
          element={<OwnerInventoryPage />}
        />

        <Route
          path="receiving"
          element={<OwnerReceivingPage />}
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
