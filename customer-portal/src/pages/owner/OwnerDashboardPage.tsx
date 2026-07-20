import { useEffect, useMemo, useState } from "react";

type Customer = {
  customerId: string;
  businessName: string;
  contactName: string;
  phone: string;
  locationAddress: string;
};

type ProductRequest = {
  requestId: string;
  customerId: string;
  businessName: string;
  productId: string;
  productName: string;
  quantityRequested: number;
  status: string;
  requestedAt: string;
};

type InventoryItem = {
  productId: string;
  productName: string;
  brand: string;
  quantityInStock: number;
  lowStock: number;
  caseCost: string;
  createdAt: string;
};

type CustomersResponse = {
  customers: Customer[];
  count: number;
};

type RequestsResponse = {
  requests: ProductRequest[];
};

type InventoryResponse = {
  items: InventoryItem[];
  count: number;
};

const API_BASE_URL =
  "https://ra280rph8l.execute-api.us-east-1.amazonaws.com";

export default function OwnerDashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [customersResponse, requestsResponse, inventoryResponse] =
          await Promise.all([
            fetch(`${API_BASE_URL}/customers`),
            fetch(`${API_BASE_URL}/requests`),
            fetch(`${API_BASE_URL}/inventory`),
          ]);

        if (!customersResponse.ok) {
          throw new Error("Unable to load customers.");
        }

        if (!requestsResponse.ok) {
          throw new Error("Unable to load requests.");
        }

        if (!inventoryResponse.ok) {
          throw new Error("Unable to load inventory.");
        }

        const customersData =
          (await customersResponse.json()) as CustomersResponse;

        const requestsData =
          (await requestsResponse.json()) as RequestsResponse;

        const inventoryData =
          (await inventoryResponse.json()) as InventoryResponse;

        setCustomers(
          Array.isArray(customersData.customers)
            ? customersData.customers
            : []
        );

        setRequests(
          Array.isArray(requestsData.requests)
            ? requestsData.requests
            : []
        );

        setInventory(
          Array.isArray(inventoryData.items)
            ? inventoryData.items
            : []
        );
      } catch (error) {
        console.error("Unable to load owner dashboard:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  const newRequests = useMemo(
    () => requests.filter((request) => request.status === "New"),
    [requests]
  );

  const inProgressRequests = useMemo(
    () =>
      requests.filter(
        (request) => request.status === "In Progress"
      ),
    [requests]
  );

  const recentRequests = useMemo(
    () =>
      [...requests]
        .sort(
          (first, second) =>
            new Date(second.requestedAt).getTime() -
            new Date(first.requestedAt).getTime()
        )
        .slice(0, 5),
    [requests]
  );

  const dashboardCards = [
    {
      label: "Total Customers",
      value: customers.length,
      description: "Registered business customers",
    },
    {
      label: "New Requests",
      value: newRequests.length,
      description: "Requests waiting for review",
    },
    {
      label: "In Progress",
      value: inProgressRequests.length,
      description: "Requests currently being handled",
    },
    {
      label: "Inventory Products",
      value: inventory.length,
      description: "Products listed in inventory",
    },
  ];

  function formatDate(dateValue: string) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function getStatusClasses(status: string) {
    if (status === "New") {
      return "bg-blue-100 text-blue-800";
    }

    if (status === "In Progress") {
      return "bg-amber-100 text-amber-800";
    }

    if (status === "Completed") {
      return "bg-green-100 text-green-800";
    }

    return "bg-slate-100 text-slate-700";
  }

  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
          Dashboard
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          Business Overview
        </h2>

        <p className="mt-3 text-slate-600">
          Review customer activity, product requests, and inventory status.
        </p>

        {loading && (
          <p className="mt-8 text-slate-600">
            Loading dashboard data...
          </p>
        )}

        {!loading && error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-700">
              Unable to load dashboard
            </p>

            <p className="mt-1 text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardCards.map((card) => (
                <article
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-500">
                    {card.label}
                  </p>

                  <p className="mt-3 text-4xl font-bold text-slate-950">
                    {card.value}
                  </p>

                  <p className="mt-3 text-sm text-slate-500">
                    {card.description}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h3 className="text-xl font-bold text-slate-950">
                  Recent Requests
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  The five most recently submitted product requests.
                </p>
              </div>

              {recentRequests.length === 0 ? (
                <div className="p-6">
                  <p className="text-slate-600">
                    No product requests have been submitted.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {recentRequests.map((request) => (
                    <article
                      key={request.requestId}
                      className="grid gap-4 px-6 py-5 md:grid-cols-[1.5fr_1fr_auto] md:items-center"
                    >
                      <div>
                        <p className="font-bold text-slate-950">
                          {request.businessName}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {request.productName} · Quantity{" "}
                          {request.quantityRequested}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">
                          {formatDate(request.requestedAt)}
                        </p>

                        <p className="mt-1 break-all text-xs text-slate-400">
                          {request.requestId}
                        </p>
                      </div>

                      <span
                        className={[
                          "w-fit rounded-full px-3 py-1 text-xs font-semibold",
                          getStatusClasses(request.status),
                        ].join(" ")}
                      >
                        {request.status}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
