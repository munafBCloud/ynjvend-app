export type InvoiceStatus =
  | "Draft"
  | "Sent"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Void";

export type InvoiceItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Invoice = {
  companyId: string;
  invoiceId: string;
  invoiceNumber: string;
  orderId: string;
  customerId: string;
  businessName: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  notes: string;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
};

export type CreateInvoiceItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type CreateInvoiceInput = {
  orderId?: string;
  customerId: string;
  businessName: string;
  status?: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  tax: number;
  amountPaid: number;
  notes: string;
  items: CreateInvoiceItem[];
};

export type InvoicesResponse = {
  invoices: Invoice[];
  count: number;
};

export type CreateInvoiceResponse = {
  message: string;
  invoice: Invoice;
};
