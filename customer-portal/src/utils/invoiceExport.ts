import type { Company } from "../services/company";
import type { Invoice } from "../types/invoice";

import {
  formatCurrency,
  formatDate,
} from "./formatters";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCompanyAddress(
  company: Company,
): string[] {
  const lines: string[] = [];

  if (company.address?.trim()) {
    lines.push(company.address.trim());
  }

  const locality = [
    company.city?.trim(),
    company.state?.trim(),
    company.postalCode?.trim(),
  ]
    .filter(Boolean)
    .join(", ")
    .replace(/,\s([^,]+)$/, " $1");

  if (locality) {
    lines.push(locality);
  }

  return lines;
}

function safeFileName(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "invoice";
}

export function openInvoiceExportWindow(): Window {
  const printWindow = window.open(
    "",
    "_blank",
  );

  if (!printWindow) {
    throw new Error(
      "Unable to open the invoice export. Allow pop-ups for DistroDex and try again.",
    );
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <title>Preparing invoice...</title>
      </head>
      <body
        style="
          margin:0;
          padding:32px;
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
          color:#111827;
          background:#ffffff;
        "
      >
        Preparing invoice...
      </body>
    </html>
  `);
  printWindow.document.close();

  return printWindow;
}

export function printInvoice(
  invoice: Invoice,
  company: Company,
  printWindow: Window,
): void {
  if (printWindow.closed) {
    throw new Error(
      "The invoice export window was closed. Try again.",
    );
  }

  const companyAddress =
    formatCompanyAddress(company);

  const itemRows = invoice.items
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${escapeHtml(item.productName)}</strong>
          </td>
          <td class="number">${escapeHtml(item.quantity)}</td>
          <td class="number">${escapeHtml(
            formatCurrency(item.unitPrice),
          )}</td>
          <td class="number">${escapeHtml(
            formatCurrency(item.lineTotal),
          )}</td>
        </tr>
      `,
    )
    .join("");

  const notes = invoice.notes?.trim()
    ? `
      <section class="notes">
        <div class="section-label">Notes</div>
        <p>${escapeHtml(invoice.notes)}</p>
      </section>
    `
    : "";

  const companyContact = [
    company.primaryContactName,
    company.primaryContactEmail,
    company.phone,
  ]
    .filter(Boolean)
    .map(
      (value) =>
        `<div>${escapeHtml(value)}</div>`,
    )
    .join("");

  const companyAddressHtml =
    companyAddress
      .map(
        (line) =>
          `<div>${escapeHtml(line)}</div>`,
      )
      .join("");

  const documentTitle =
    safeFileName(invoice.invoiceNumber);

  printWindow.document.open();

  printWindow.document.write(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />
  <title>${escapeHtml(documentTitle)}</title>

  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #111827;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Arial,
        sans-serif;
    }

    body {
      padding: 40px;
    }

    .invoice {
      width: 100%;
      max-width: 850px;
      margin: 0 auto;
    }

    .top {
      display: flex;
      justify-content: space-between;
      gap: 40px;
      padding-bottom: 28px;
      border-bottom: 3px solid #111827;
    }

    .brand {
      min-width: 0;
    }

    .brand h1 {
      margin: 0 0 8px;
      font-size: 27px;
      line-height: 1.1;
      letter-spacing: -0.03em;
    }

    .brand-details {
      color: #4b5563;
      font-size: 13px;
      line-height: 1.6;
    }

    .invoice-title {
      text-align: right;
      flex-shrink: 0;
    }

    .invoice-title h2 {
      margin: 0 0 8px;
      font-size: 34px;
      letter-spacing: 0.08em;
    }

    .invoice-number {
      font-size: 14px;
      font-weight: 700;
    }

    .status {
      display: inline-block;
      margin-top: 10px;
      padding: 5px 9px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .meta {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 32px;
      margin: 28px 0;
    }

    .section-label {
      margin-bottom: 8px;
      color: #6b7280;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .bill-to strong {
      display: block;
      font-size: 18px;
    }

    .dates {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .date-box {
      padding: 12px;
      border: 1px solid #e5e7eb;
    }

    .date-box span {
      display: block;
      margin-bottom: 4px;
      color: #6b7280;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .date-box strong {
      font-size: 13px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }

    th {
      padding: 11px 10px;
      border-bottom: 2px solid #111827;
      text-align: left;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    td {
      padding: 13px 10px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
      vertical-align: top;
    }

    th.number,
    td.number {
      text-align: right;
    }

    .bottom {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 40px;
      margin-top: 30px;
      align-items: start;
    }

    .reference {
      color: #4b5563;
      font-size: 12px;
      line-height: 1.7;
    }

    .reference strong {
      color: #111827;
    }

    .totals {
      width: 100%;
    }

    .total-line {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      padding: 7px 0;
      font-size: 13px;
    }

    .total-line span:first-child {
      color: #4b5563;
    }

    .total-line.total {
      margin-top: 6px;
      padding-top: 12px;
      border-top: 2px solid #111827;
      font-size: 17px;
      font-weight: 800;
    }

    .total-line.balance {
      margin-top: 4px;
      padding: 12px;
      background: #f3f4f6;
      font-size: 15px;
      font-weight: 800;
    }

    .notes {
      margin-top: 32px;
      padding: 16px;
      border: 1px solid #e5e7eb;
    }

    .notes p {
      margin: 0;
      white-space: pre-wrap;
      font-size: 12px;
      line-height: 1.6;
    }

    .footer {
      margin-top: 42px;
      padding-top: 14px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 10px;
      text-align: center;
    }

    @page {
      size: auto;
      margin: 0.5in;
    }

    @media print {
      body {
        padding: 0;
      }

      .invoice {
        max-width: none;
      }
    }

    @media (max-width: 620px) {
      body {
        padding: 22px;
      }

      .top {
        display: block;
      }

      .invoice-title {
        margin-top: 24px;
        text-align: left;
      }

      .meta,
      .bottom {
        grid-template-columns: 1fr;
      }

      .dates {
        grid-template-columns: 1fr 1fr;
      }

      table {
        font-size: 11px;
      }

      th,
      td {
        padding-left: 6px;
        padding-right: 6px;
      }
    }
  </style>
</head>

<body>
  <main class="invoice">
    <header class="top">
      <div class="brand">
        <h1>${escapeHtml(company.businessName)}</h1>

        <div class="brand-details">
          ${companyContact}
          ${companyAddressHtml}
        </div>
      </div>

      <div class="invoice-title">
        <h2>INVOICE</h2>

        <div class="invoice-number">
          ${escapeHtml(invoice.invoiceNumber)}
        </div>

        <div class="status">
          ${escapeHtml(invoice.status)}
        </div>
      </div>
    </header>

    <section class="meta">
      <div class="bill-to">
        <div class="section-label">
          Bill To
        </div>

        <strong>
          ${escapeHtml(invoice.businessName)}
        </strong>
      </div>

      <div class="dates">
        <div class="date-box">
          <span>Issue Date</span>
          <strong>
            ${escapeHtml(
              formatDate(invoice.issueDate),
            )}
          </strong>
        </div>

        <div class="date-box">
          <span>Due Date</span>
          <strong>
            ${escapeHtml(
              formatDate(invoice.dueDate),
            )}
          </strong>
        </div>
      </div>
    </section>

    <section>
      <div class="section-label">
        Invoice Items
      </div>

      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th class="number">Qty</th>
            <th class="number">Unit Price</th>
            <th class="number">Amount</th>
          </tr>
        </thead>

        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </section>

    <section class="bottom">
      <div class="reference">
        <div class="section-label">
          Reference
        </div>

        <div>
          <strong>Order:</strong>
          ${escapeHtml(invoice.orderId)}
        </div>

        <div>
          <strong>Invoice:</strong>
          ${escapeHtml(invoice.invoiceNumber)}
        </div>
      </div>

      <div class="totals">
        <div class="total-line">
          <span>Subtotal</span>
          <strong>
            ${escapeHtml(
              formatCurrency(invoice.subtotal),
            )}
          </strong>
        </div>

        <div class="total-line">
          <span>Tax</span>
          <strong>
            ${escapeHtml(
              formatCurrency(invoice.tax),
            )}
          </strong>
        </div>

        <div class="total-line">
          <span>Discount</span>
          <strong>
            ${escapeHtml(
              formatCurrency(invoice.discount),
            )}
          </strong>
        </div>

        <div class="total-line total">
          <span>Total</span>
          <span>
            ${escapeHtml(
              formatCurrency(invoice.total),
            )}
          </span>
        </div>

        <div class="total-line">
          <span>Amount Paid</span>
          <strong>
            ${escapeHtml(
              formatCurrency(invoice.amountPaid),
            )}
          </strong>
        </div>

        <div class="total-line balance">
          <span>Balance Due</span>
          <span>
            ${escapeHtml(
              formatCurrency(invoice.balanceDue),
            )}
          </span>
        </div>
      </div>
    </section>

    ${notes}

    <footer class="footer">
      Generated from DistroDex
    </footer>
  </main>
</body>
</html>
  `);

  printWindow.document.close();

  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
}
