import type { InvoiceStatus } from "../types/invoice";
import type { OrderStatus } from "../types/order";

export function getOrderStatusClasses(
  status: OrderStatus,
): string {
  switch (status) {
    case "New":
      return "bg-blue-100 text-blue-800";

    case "Preparing":
      return "bg-amber-100 text-amber-800";

    case "Completed":
      return "bg-green-100 text-green-800";

    case "Cancelled":
      return "bg-slate-200 text-slate-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function getInvoiceStatusClasses(
  status: InvoiceStatus,
): string {
  switch (status) {
    case "Draft":
      return "bg-slate-200 text-slate-700";

    case "Sent":
      return "bg-blue-100 text-blue-800";

    case "Partially Paid":
      return "bg-amber-100 text-amber-800";

    case "Paid":
      return "bg-green-100 text-green-800";

    case "Overdue":
      return "bg-red-100 text-red-800";

    case "Void":
      return "bg-slate-900 text-white";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function getRequestStatusClasses(
  status: string,
): string {
  switch (status) {
    case "New":
      return "bg-blue-100 text-blue-800";

    case "In Progress":
      return "bg-amber-100 text-amber-800";

    case "Completed":
      return "bg-green-100 text-green-800";

    default:
      return "bg-slate-100 text-slate-700";
  }
}
