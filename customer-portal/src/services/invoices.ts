import { apiRequest } from "./api";

import type {
  CreateInvoiceInput,
  CreateInvoiceResponse,
  Invoice,
  InvoicesResponse,
  InvoiceStatus,
} from "../types/invoice";

export type UpdateInvoiceInput = {
  status?: InvoiceStatus;
  amountPaid?: number;
  notes?: string;
  dueDate?: string;
};

type UpdateInvoiceResponse = {
  message: string;
  invoice: Invoice;
};

export async function getInvoices(): Promise<Invoice[]> {
  const data = await apiRequest<InvoicesResponse>("/invoices");

  return Array.isArray(data.invoices) ? data.invoices : [];
}

export async function createInvoice(
  invoiceInput: CreateInvoiceInput,
): Promise<Invoice> {
  const data = await apiRequest<CreateInvoiceResponse>("/invoices", {
    method: "POST",
    body: JSON.stringify(invoiceInput),
  });

  return data.invoice;
}

export async function updateInvoice(
  invoiceId: string,
  update: UpdateInvoiceInput,
): Promise<Invoice> {
  const data = await apiRequest<UpdateInvoiceResponse>(
    `/invoices/${encodeURIComponent(invoiceId)}`,
    {
      method: "PUT",
      body: JSON.stringify(update),
    },
  );

  return data.invoice;
}
