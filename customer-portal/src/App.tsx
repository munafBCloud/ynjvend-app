import { Route, Routes } from "react-router";

import ProtectedRoute from "./auth/ProtectedRoute";

import CustomerLayout from "./layouts/CustomerLayout";
import OwnerLayout from "./layouts/OwnerLayout";
import OwnerInvoicesPage from "./pages/owner/OwnerInvoicesPage";

import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import ProductsPage from "./pages/ProductsPage";
import RequestPage from "./pages/RequestPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import LoginPage from "./pages/auth/LoginPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

import OwnerAnalyticsPage from "./pages/owner/OwnerAnalyticsPage";
import OwnerCustomersPage from "./pages/owner/OwnerCustomersPage";
import OwnerDashboardPage from "./pages/owner/OwnerDashboardPage";
import OwnerInventoryPage from "./pages/owner/OwnerInventoryPage";
import OwnerOrdersPage from "./pages/owner/OwnerOrdersPage";
import OwnerRequestsPage from "./pages/owner/OwnerRequestsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/request" element={<RequestPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

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
        <Route path="analytics" element={<OwnerAnalyticsPage />} />
        <Route path="customers" element={<OwnerCustomersPage />} />
        <Route path="requests" element={<OwnerRequestsPage />} />
        <Route path="orders" element={<OwnerOrdersPage />} />
        <Route path="invoices" element={<OwnerInvoicesPage />} />
        <Route path="inventory" element={<OwnerInventoryPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
