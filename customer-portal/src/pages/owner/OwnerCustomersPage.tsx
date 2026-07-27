import { useEffect, useMemo, useState } from "react";

import CustomerModal from "../../components/CustomerModal";
import {
  createCustomer,
  getCustomers,
} from "../../services/customers";

import type {
  CreateCustomerInput,
  Customer,
} from "../../types/customer";

export default function OwnerCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    "asc",
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoading(true);
        setError("");

        const items = await getCustomers();
        setCustomers(items);
      } catch (error) {
        console.error("Unable to load customers:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load customers.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...customers]
      .filter((customer) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          customer.businessName
            .toLowerCase()
            .includes(normalizedSearch) ||
          customer.contactName
            .toLowerCase()
            .includes(normalizedSearch) ||
          customer.phone
            .toLowerCase()
            .includes(normalizedSearch) ||
          customer.locationAddress
            .toLowerCase()
            .includes(normalizedSearch) ||
          customer.email
            ?.toLowerCase()
            .includes(normalizedSearch) ||
          customer.customerId
            .toLowerCase()
            .includes(normalizedSearch)
        );
      })
      .sort((first, second) => {
        const comparison = first.businessName.localeCompare(
          second.businessName,
        );

        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [customers, searchTerm, sortDirection]);

  async function handleCreateCustomer(
    customerInput: CreateCustomerInput,
  ) {
    try {
      setCreatingCustomer(true);
      setSuccessMessage("");

      const createdCustomer = await createCustomer(customerInput);

      setCustomers((currentCustomers) => [
        ...currentCustomers,
        createdCustomer,
      ]);

      setSuccessMessage(
        `${createdCustomer.businessName} was added successfully.`,
      );
    } catch (error) {
      console.error("Unable to create customer:", error);
      throw error;
    } finally {
      setCreatingCustomer(false);
    }
  }

  function openCustomerModal() {
    setSuccessMessage("");
    setCustomerModalOpen(true);
  }

  function closeCustomerModal() {
    if (creatingCustomer) {
      return;
    }

    setCustomerModalOpen(false);
  }

  return (
    <>
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
                Customer Management
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-950">
                Business Customers
              </h2>

              <p className="mt-3 text-slate-600">
                Add, search, and review customers registered with YNJ Vend.
              </p>
            </div>

            <button
              type="button"
              onClick={openCustomerModal}
              className="inline-flex items-center justify-center rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              + Add Customer
            </button>
          </div>

          {successMessage && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="font-semibold text-green-800">
                {successMessage}
              </p>
            </div>
          )}

          {loading && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-slate-600">Loading customers...</p>
            </div>
          )}

          {!loading && error && (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
              <p className="font-semibold text-red-800">
                Unable to load customers
              </p>

              <p className="mt-2 text-sm text-red-700">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <SummaryCard
                  label="Total Customers"
                  value={customers.length}
                />

                <SummaryCard
                  label="Matching Results"
                  value={filteredCustomers.length}
                />
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div>
                    <label
                      htmlFor="customer-search"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Search customers
                    </label>

                    <input
                      id="customer-search"
                      type="search"
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(event.target.value)
                      }
                      placeholder="Search business, contact, phone, email, address, or ID"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSortDirection((currentDirection) =>
                        currentDirection === "asc" ? "desc" : "asc",
                      )
                    }
                    className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Sort:{" "}
                    {sortDirection === "asc" ? "A to Z" : "Z to A"}
                  </button>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-5">
                  <h3 className="text-xl font-bold text-slate-950">
                    Customer Directory
                  </h3>

                  <p className="mt-1 text-sm text-slate-600">
                    Showing {filteredCustomers.length} of{" "}
                    {customers.length} customers.
                  </p>
                </div>

                {filteredCustomers.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="font-semibold text-slate-800">
                      No customers found
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Add a customer or try changing your search term.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <TableHeading>Business</TableHeading>
                          <TableHeading>Contact</TableHeading>
                          <TableHeading>Phone</TableHeading>
                          <TableHeading>Email</TableHeading>
                          <TableHeading>Location</TableHeading>
                          <TableHeading>Customer ID</TableHeading>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-200">
                        {filteredCustomers.map((customer) => (
                          <tr
                            key={customer.customerId}
                            className="hover:bg-slate-50"
                          >
                            <TableCell>
                              <p className="font-semibold text-slate-950">
                                {customer.businessName}
                              </p>
                            </TableCell>

                            <TableCell>
                              <p className="text-slate-800">
                                {customer.contactName}
                              </p>
                            </TableCell>

                            <TableCell>
                              <a
                                href={`tel:${customer.phone}`}
                                className="font-medium text-red-700 hover:underline"
                              >
                                {customer.phone}
                              </a>
                            </TableCell>

                            <TableCell>
                              {customer.email ? (
                                <a
                                  href={`mailto:${customer.email}`}
                                  className="font-medium text-red-700 hover:underline"
                                >
                                  {customer.email}
                                </a>
                              ) : (
                                <span className="text-sm text-slate-400">
                                  Not provided
                                </span>
                              )}
                            </TableCell>

                            <TableCell>
                              <p className="max-w-sm text-slate-700">
                                {customer.locationAddress}
                              </p>
                            </TableCell>

                            <TableCell>
                              <p
                                title={customer.customerId}
                                className="max-w-44 truncate text-xs text-slate-500"
                              >
                                {customer.customerId}
                              </p>
                            </TableCell>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <CustomerModal
        open={customerModalOpen}
        loading={creatingCustomer}
        onClose={closeCustomerModal}
        onCreate={handleCreateCustomer}
      />
    </>
  );
}

type SummaryCardProps = {
  label: string;
  value: number;
};

function SummaryCard({
  label,
  value,
}: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-4xl font-bold text-slate-950">
        {value}
      </p>
    </article>
  );
}

type TableContentProps = {
  children: React.ReactNode;
};

function TableHeading({
  children,
}: TableContentProps) {
  return (
    <th
      scope="col"
      className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
}: TableContentProps) {
  return (
    <td className="px-6 py-5 align-top">
      {children}
    </td>
  );
}
