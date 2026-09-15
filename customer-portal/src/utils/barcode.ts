import {
  BarcodeFormat,
} from "@zxing/library";

export type BarcodeType =
  | "UPC-A"
  | "UPC-E"
  | "EAN-8"
  | "EAN-13"
  | "CODE-128";

export function formatBarcodeType(
  format: BarcodeFormat,
): BarcodeType | null {
  switch (format) {
    case BarcodeFormat.UPC_A:
      return "UPC-A";

    case BarcodeFormat.UPC_E:
      return "UPC-E";

    case BarcodeFormat.EAN_8:
      return "EAN-8";

    case BarcodeFormat.EAN_13:
      return "EAN-13";

    case BarcodeFormat.CODE_128:
      return "CODE-128";

    default:
      return null;
  }
}

export function inferBarcodeType(
  value: string,
): BarcodeType {
  if (/^\d{12}$/.test(value)) {
    return "UPC-A";
  }

  if (/^\d{13}$/.test(value)) {
    return "EAN-13";
  }

  if (/^\d{8}$/.test(value)) {
    return "EAN-8";
  }

  return "CODE-128";
}
