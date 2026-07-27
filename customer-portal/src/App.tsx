import { Route, Routes } from "react-router";

import ProtectedRoute from "./auth/ProtectedRoute";

import CustomerLayout from "./layouts/CustomerLayout";
import OwnerLayout from "./layouts/OwnerLayout";

import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import ProductsPage from "./pages/ProductsPage";
import RequestPage from "./pages/RequestPage";
import LoginPage from "./pages/auth/LoginPage";

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
        path="/owner"
        element={
          <ProtectedRoute>
            <OwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OwnerDashboardPage />} />
        <Route path="customers" element={<OwnerCustomersPage />} />
        <Route path="requests" element={<OwnerRequestsPage />} />
        <Route path="orders" element={<OwnerOrdersPage />} />
        <Route path="inventory" element={<OwnerInventoryPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
