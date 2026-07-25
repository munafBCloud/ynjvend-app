import { Route, Routes } from "react-router";

import CustomerLayout from "./layouts/CustomerLayout";
import OwnerLayout from "./layouts/OwnerLayout";

import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import ProductsPage from "./pages/ProductsPage";
import RequestPage from "./pages/RequestPage";

import OwnerCustomersPage from "./pages/owner/OwnerCustomersPage";
import OwnerDashboardPage from "./pages/owner/OwnerDashboardPage";
import OwnerInventoryPage from "./pages/owner/OwnerInventoryPage";
import OwnerOrdersPage from "./pages/owner/OwnerOrdersPage";

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

      <Route path="/owner" element={<OwnerLayout />}>
        <Route index element={<OwnerDashboardPage />} />
        <Route path="orders" element={<OwnerOrdersPage />} />
        <Route path="customers" element={<OwnerCustomersPage />} />
        <Route path="inventory" element={<OwnerInventoryPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
