import { useEffect, useMemo, useState } from "react";

import type {
  ProductRequest,
  RequestStatus,
} from "../../types/request";

import {
  getRequests,
  updateRequestStatus as updateRequestStatusApi,
} from "../../services/requests";

const STATUS_FILTERS = [
  "All",
  "New",
  "In Progress",
  "Completed",
] as const;

const REQUEST_STATUSES: RequestStatus[] = [
  "New",
  "In Progress",
  "Completed",
];

export default function OwnerRequestsPage() {
  const [requests, setRequests] = useState<ProductRequest[]>([]);

  const [selectedStatuses, setSelectedStatuses] = useState<
    Record<string, RequestStatus>
  >({});

  const [updatingRequestId, setUpdatingRequestId] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRequests() {
      try {
        setLoading(true);
        setError("");

        const loadedRequests = await getRequests();

        setRequests(loadedRequests);

        const initialStatuses: Record<string, RequestStatus> = {};

        loadedRequests.forEach((request) => {
          initialStatuses[request.requestId] = request.status;
        });

        setSelectedStatuses(initialStatuses);
      } catch (error) {
        console.error("Unable to load requests:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load requests."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...requests]
      .filter((request) => {
        const matchesStatus =
          statusFilter === "All" ||
          request.status === statusFilter;

        const matchesSearch =
          normalizedSearch.length === 0 ||
          request.businessName
            .toLowerCase()
            .includes(normalizedSearch) ||
          request.productName
            .toLowerCase()
            .includes(normalizedSearch) ||
          request.requestId
            .toLowerCase()
            .includes(normalizedSearch);

        return matchesStatus && matchesSearch;
      })
      .sort(
        (first, second) =>
          new Date(second.requestedAt).getTime() -
          new Date(first.requestedAt).getTime()
      );
  }, [requests, searchTerm, statusFilter]);

  const requestCounts = useMemo(() => {
    return {
      total: requests.length,

      new: requests.filter(
        (request) => request.status === "New"
      ).length,

      inProgress: requests.filter(
        (request) => request.status === "In Progress"
      ).length,

      completed: requests.filter(
        (request) => request.status === "Completed"
      ).length,
    };
  }, [requests]);

  async function handleUpdateRequestStatus(
    requestId: string
  ) {
    const selectedStatus = selectedStatuses[requestId];

    if (!selectedStatus) {
      setUpdateError("Select a valid request status.");
      return;
    }

    try {
      setUpdatingRequestId(requestId);
      setSuccessMessage("");
      setUpdateError("");

      await updateRequestStatusApi(
        requestId,
        selectedStatus
      );

      setRequests((currentRequests) =>
        currentRequests.map((request) =>
          request.requestId === requestId
            ? {
                ...request,
                status: selectedStatus,
              }
            : request
        )
      );

      setSuccessMessage(
        `Request status updated to ${selectedStatus}.`
      );
    } catch (error) {
      console.error("Unable to update request:", error);

      setUpdateError(
        error instanceof Error
          ? error.message
          : "Unable to update request."
      );
    } finally {
      setUpdatingRequestId(null);
    }
  }

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

  function getStatusClasses(status: RequestStatus) {
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
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
            Operations
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            Request Management
          </h2>

          <p className="mt-3 text-slate-600">
            Review and update product requests submitted by
            customers.
          </p>
        </div>

        {successMessage && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-800">
              {successMessage}
            </p>
          </div>
        )}

        {updateError && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-red-800">
              {updateError}
            </p>
          </div>
        )}

        {loading && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-slate-600">
              Loading product requests...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
            <p className="font-semibold text-red-800">
              Unable to load requests
            </p>

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total Requests"
                value={requestCounts.total}
              />

              <SummaryCard
                label="New"
                value={requestCounts.new}
              />

              <SummaryCard
                label="In Progress"
                value={requestCounts.inProgress}
              />

              <SummaryCard
                label="Completed"
                value={requestCounts.completed}
              />
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <label
                    htmlFor="request-search"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Search requests
                  </label>

                  <input
                    id="request-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.target.value)
                    }
                    placeholder="Search business, product, or request ID"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Filter by status
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {STATUS_FILTERS.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setStatusFilter(status)
                        }
                        className={[
                          "rounded-xl px-4 py-3 text-sm font-semibold transition",
                          statusFilter === status
                            ? "bg-slate-950 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                        ].join(" ")}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h3 className="text-xl font-bold text-slate-950">
                  Product Requests
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  Showing {filteredRequests.length} of{" "}
                  {requests.length} requests.
                </p>
              </div>

              {filteredRequests.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="font-semibold text-slate-800">
                    No requests found
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Try changing the search term or status
                    filter.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <TableHeading>Business</TableHeading>
                        <TableHeading>Product</TableHeading>
                        <TableHeading>Quantity</TableHeading>
                        <TableHeading>
                          Current Status
                        </TableHeading>
                        <TableHeading>
                          Update Status
                        </TableHeading>
                        <TableHeading>Submitted</TableHeading>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {filteredRequests.map((request) => {
                        const selectedStatus =
                          selectedStatuses[
                            request.requestId
                          ] || request.status;

                        const statusHasChanged =
                          selectedStatus !== request.status;

                        const isUpdating =
                          updatingRequestId ===
                          request.requestId;

                        return (
                          <tr
                            key={request.requestId}
                            className="hover:bg-slate-50"
                          >
                            <TableCell>
                              <p className="font-semibold text-slate-950">
                                {request.businessName}
                              </p>

                              <p className="mt-1 max-w-44 truncate text-xs text-slate-500">
                                {request.requestId}
                              </p>
                            </TableCell>

                            <TableCell>
                              <p className="font-medium text-slate-900">
                                {request.productName}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {request.productId}
                              </p>
                            </TableCell>

                            <TableCell>
                              <span className="font-semibold text-slate-950">
                                {request.quantityRequested}
                              </span>
                            </TableCell>

                            <TableCell>
                              <span
                                className={[
                                  "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                                  getStatusClasses(
                                    request.status
                                  ),
                                ].join(" ")}
                              >
                                {request.status}
                              </span>
                            </TableCell>

                            <TableCell>
                              <div className="flex min-w-52 items-center gap-2">
                                <select
                                  value={selectedStatus}
                                  onChange={(event) =>
                                    setSelectedStatuses(
                                      (
                                        currentStatuses
                                      ) => ({
                                        ...currentStatuses,
                                        [request.requestId]:
                                          event.target
                                            .value as RequestStatus,
                                      })
                                    )
                                  }
                                  disabled={isUpdating}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-700"
                                >
                                  {REQUEST_STATUSES.map(
                                    (status) => (
                                      <option
                                        key={status}
                                        value={status}
                                      >
                                        {status}
                                      </option>
                                    )
                                  )}
                                </select>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleUpdateRequestStatus(
                                      request.requestId
                                    )
                                  }
                                  disabled={
                                    !statusHasChanged ||
                                    isUpdating
                                  }
                                  className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                  {isUpdating
                                    ? "Saving..."
                                    : "Update"}
                                </button>
                              </div>
                            </TableCell>

                            <TableCell>
                              <span className="whitespace-nowrap text-sm text-slate-600">
                                {formatDate(
                                  request.requestedAt
                                )}
                              </span>
                            </TableCell>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
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
