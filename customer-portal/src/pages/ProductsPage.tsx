import { useEffect, useState } from "react";
import { Link } from "react-router";

type Product = {
  productId: string;
  productName: string;
  brand: string;
  availability: string;
};

type InventoryResponse = {
  count: number;
  items: Product[];
};

const INVENTORY_API_URL =
  "https://ra280rph8l.execute-api.us-east-1.amazonaws.com/public/inventory";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      try {
        setError("");

        const response = await fetch(INVENTORY_API_URL);

        if (!response.ok) {
          throw new Error(`Inventory request failed: ${response.status}`);
        }

        const data = (await response.json()) as InventoryResponse;

        setProducts(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        console.error("Unable to load inventory:", error);
        setError("Unable to load inventory at this time.");
      } finally {
        setLoading(false);
      }
    }

    void loadProducts();
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wider text-red-700">
        Inventory
      </p>

      <h1 className="mt-3 text-4xl font-bold text-slate-950">
        Available Products
      </h1>

      <p className="mt-4 max-w-2xl text-slate-600">
        Browse currently available wholesale beverages and select a product to
        begin your request.
      </p>

      {loading && (
        <p className="mt-10 text-slate-600">Loading inventory...</p>
      )}

      {!loading && error && (
        <div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-slate-600">
            No products are currently available.
          </p>
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.productId}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
                {product.brand}
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                {product.productName}
              </h2>

              <p className="mt-4 font-semibold text-green-700">
                {product.availability}
              </p>

              <Link
                to={`/request?productId=${encodeURIComponent(
                  product.productId
                )}&productName=${encodeURIComponent(product.productName)}`}
                className="mt-6 block w-full rounded-xl bg-red-700 py-3 text-center font-semibold text-white transition hover:bg-red-800"
              >
                Request Product
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
