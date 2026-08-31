import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import CustomerModal from "../../components/CustomerModal";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import SummaryCard from "../../components/SummaryCard";

import {
  createCustomer,
  getCustomers,
} from "../../services/customers";

import type {
  CreateCustomerInput,
  Customer,
} from "../../types/customer";

export default function OwnerCustomersPage() {
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [sortDirection, setSortDirection] =
    useState<"asc" | "desc">("asc");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    customerModalOpen,
    setCustomerModalOpen,
  ] = useState(false);

  const [
    creatingCustomer,
    setCreatingCustomer,
  ] = useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoading(true);
        setError("");

        const items =
          await getCustomers();

        setCustomers(items);
      } catch (loadError) {
        console.error(
          "Unable to load customers:",
          loadError,
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load customers.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

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
        const comparison =
          first.businessName.localeCompare(
            second.businessName,
          );

        return sortDirection === "asc"
          ? comparison
          : -comparison;
      });
  }, [
    customers,
    searchTerm,
    sortDirection,
  ]);

  const customersWithEmail = useMemo(
    () =>
      customers.filter(
        (customer) =>
          Boolean(customer.email),
      ).length,
    [customers],
  );

  const customersWithoutEmail =
    customers.length -
    customersWithEmail;

  async function handleCreateCustomer(
    customerInput: CreateCustomerInput,
  ) {
    try {
      setCreatingCustomer(true);
      setSuccessMessage("");

      const createdCustomer =
        await createCustomer(
          customerInput,
        );

      setCustomers(
        (currentCustomers) => [
          ...currentCustomers,
          createdCustomer,
        ],
      );

      setSuccessMessage(
        `${createdCustomer.businessName} was added successfully.`,
      );
    } catch (createError) {
      console.error(
        "Unable to create customer:",
        createError,
      );

      throw createError;
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
      <section className="dd-customers">
        <div className="dd-customers__inner">
          <header className="dd-customers__header">
            <div>
              <div className="dd-customers__eyebrow">
                <span />
                Customer Operations
              </div>

              <h1>
                Business Customers
              </h1>

              <p>
                Manage customer accounts,
                contact details, and business
                locations used across orders
                and invoicing.
              </p>
            </div>

            <button
              type="button"
              onClick={openCustomerModal}
              className="dd-customers__add"
            >
              <span
                className="dd-customers__add-plus"
                aria-hidden="true"
              >
                +
              </span>

              <span>
                Add Customer
              </span>
            </button>
          </header>

          {successMessage && (
            <div className="dd-customers__success">
              <span
                className="dd-customers__success-dot"
                aria-hidden="true"
              />

              <p>
                {successMessage}
              </p>
            </div>
          )}

          {loading && (
            <LoadingState message="Loading customers..." />
          )}

          {!loading && error && (
            <ErrorMessage
              title="Unable to load customers"
              message={error}
            />
          )}

          {!loading && !error && (
            <>
              <div className="dd-customers__metrics">
                <SummaryCard
                  label="Customers"
                  value={customers.length}
                  description="Active customer records"
                  accent="blue"
                />

                <SummaryCard
                  label="Results"
                  value={
                    filteredCustomers.length
                  }
                  description="Currently displayed"
                  accent="neutral"
                />

                <SummaryCard
                  label="Email On File"
                  value={
                    customersWithEmail
                  }
                  description="Customers with email"
                  accent="blue"
                />

                <SummaryCard
                  label="Missing Email"
                  value={
                    customersWithoutEmail
                  }
                  description="Contact records incomplete"
                  accent={
                    customersWithoutEmail > 0
                      ? "orange"
                      : "neutral"
                  }
                />
              </div>

              <section className="dd-customers__controls">
                <div className="dd-customers__search">
                  <label htmlFor="customer-search">
                    Search Customers
                  </label>

                  <div className="dd-customers__search-input">
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        cx="11"
                        cy="11"
                        r="6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />

                      <path
                        d="m16 16 4 4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>

                    <input
                      id="customer-search"
                      type="search"
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(
                          event.target.value,
                        )
                      }
                      placeholder="Business, contact, phone, email, address, or ID"
                    />

                    {searchTerm.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSearchTerm("")
                        }
                        className="dd-customers__clear"
                        aria-label="Clear customer search"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSortDirection(
                      (currentDirection) =>
                        currentDirection ===
                        "asc"
                          ? "desc"
                          : "asc",
                    )
                  }
                  className="dd-customers__sort"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 5v14M5 8l3-3 3 3M16 19V5M13 16l3 3 3-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <span>
                    {sortDirection === "asc"
                      ? "A — Z"
                      : "Z — A"}
                  </span>
                </button>
              </section>

              <section className="dd-customers__directory">
                <div className="dd-customers__directory-header">
                  <div>
                    <p className="dd-label">
                      Customer Directory
                    </p>

                    <h2>
                      Account Overview
                    </h2>
                  </div>

                  <p className="dd-customers__result-count">
                    Showing{" "}
                    <strong>
                      {
                        filteredCustomers.length
                      }
                    </strong>{" "}
                    of{" "}
                    <strong>
                      {customers.length}
                    </strong>
                  </p>
                </div>

                {filteredCustomers.length ===
                0 ? (
                  <div className="dd-customers__empty">
                    <div className="dd-customers__empty-icon">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 2a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 21v-2a6 6 0 0 1 12 0v2m1-5c3 0 5 1.8 5 4v1"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    <div>
                      <strong>
                        No customers found
                      </strong>

                      <p>
                        Add a customer or
                        adjust your search.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="dd-customers__desktop-table">
                      <table>
                        <thead>
                          <tr>
                            <TableHeading>
                              Business
                            </TableHeading>

                            <TableHeading>
                              Contact
                            </TableHeading>

                            <TableHeading>
                              Phone
                            </TableHeading>

                            <TableHeading>
                              Email
                            </TableHeading>

                            <TableHeading>
                              Location
                            </TableHeading>

                            <TableHeading>
                              Customer ID
                            </TableHeading>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredCustomers.map(
                            (customer) => (
                              <CustomerTableRow
                                key={
                                  customer.customerId
                                }
                                customer={
                                  customer
                                }
                              />
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="dd-customers__mobile-list">
                      {filteredCustomers.map(
                        (customer) => (
                          <CustomerMobileCard
                            key={
                              customer.customerId
                            }
                            customer={
                              customer
                            }
                          />
                        ),
                      )}
                    </div>
                  </>
                )}
              </section>
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

function CustomerTableRow({
  customer,
}: {
  customer: Customer;
}) {
  return (
    <tr>
      <TableCell>
        <div className="dd-customers__business">
          <div className="dd-customers__business-marker" />

          <div>
            <p className="dd-customers__business-name">
              {customer.businessName}
            </p>

            <p className="dd-customers__customer-id">
              {customer.customerId}
            </p>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <span className="dd-customers__contact">
          {customer.contactName}
        </span>
      </TableCell>

      <TableCell>
        <a
          href={`tel:${customer.phone}`}
          className="dd-customers__link"
        >
          {customer.phone}
        </a>
      </TableCell>

      <TableCell>
        {customer.email ? (
          <a
            href={`mailto:${customer.email}`}
            className="dd-customers__link"
          >
            {customer.email}
          </a>
        ) : (
          <span className="dd-customers__missing">
            Not provided
          </span>
        )}
      </TableCell>

      <TableCell>
        <span className="dd-customers__location">
          {customer.locationAddress}
        </span>
      </TableCell>

      <TableCell>
        <span
          className="dd-customers__id"
          title={customer.customerId}
        >
          {customer.customerId}
        </span>
      </TableCell>
    </tr>
  );
}

function CustomerMobileCard({
  customer,
}: {
  customer: Customer;
}) {
  return (
    <article className="dd-customers__mobile-card">
      <div className="dd-customers__mobile-top">
        <div className="dd-customers__business">
          <div className="dd-customers__business-marker" />

          <div>
            <p className="dd-customers__business-name">
              {customer.businessName}
            </p>

            <p className="dd-customers__contact">
              {customer.contactName}
            </p>
          </div>
        </div>

        <span
          className={[
            "dd-customers__record-status",
            customer.email
              ? "dd-customers__record-status--complete"
              : "dd-customers__record-status--attention",
          ].join(" ")}
        >
          <span />

          {customer.email
            ? "Contact Ready"
            : "Email Missing"}
        </span>
      </div>

      <div className="dd-customers__mobile-contact">
        <a
          href={`tel:${customer.phone}`}
        >
          <span>Phone</span>

          <strong>
            {customer.phone}
          </strong>
        </a>

        <div>
          <span>Email</span>

          {customer.email ? (
            <a
              href={`mailto:${customer.email}`}
            >
              {customer.email}
            </a>
          ) : (
            <strong className="dd-customers__mobile-missing">
              Not provided
            </strong>
          )}
        </div>
      </div>

      <div className="dd-customers__mobile-location">
        <span>
          Location
        </span>

        <p>
          {customer.locationAddress}
        </p>
      </div>

      <div className="dd-customers__mobile-footer">
        <span>
          Customer ID
        </span>

        <strong>
          {customer.customerId}
        </strong>
      </div>
    </article>
  );
}

type TableContentProps = {
  children: ReactNode;
};

function TableHeading({
  children,
}: TableContentProps) {
  return (
    <th
      scope="col"
      className="dd-customers__th"
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
}: TableContentProps) {
  return (
    <td className="dd-customers__td">
      {children}
    </td>
  );
}
