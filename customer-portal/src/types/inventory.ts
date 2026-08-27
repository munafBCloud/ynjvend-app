export type InventoryStatus =
  | "active"
  | "inactive"
  | "archived";

export type InventoryItem = {
  companyId?: string;
  productId: string;
  productName: string;
  brand: string;
  quantityInStock: number;
  reorderLevel: number;
  caseCost: number;
  sellingPrice: number;
  status: InventoryStatus;

  barcode?: string;
  barcodeType?: string;

  availability?: string;
  createdAt: string;
  updatedAt: string;
};

export type InventoryResponse = {
  items: InventoryItem[];
  count?: number;
};

export type CreateInventoryInput = {
  productName: string;
  brand: string;
  quantityInStock: number;
  reorderLevel: number;
  caseCost: number;
  sellingPrice: number;
  status: InventoryStatus;

  barcode?: string;
  barcodeType?: string;
};

export type CreateInventoryResponse = {
  message?: string;
  item?: InventoryItem;
  productId?: string;
};
