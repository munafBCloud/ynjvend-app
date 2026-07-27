export type InventoryItem = {
  productId: string;
  productName: string;
  brand: string;
  quantityInStock: number;
  lowStock: number;
  caseCost: string;
  availability?: string;
  createdAt: string;
};

export type InventoryResponse = {
  items: InventoryItem[];
  count?: number;
};

export type CreateInventoryInput = {
  productName: string;
  brand: string;
  quantityInStock: number;
  lowStock: number;
  caseCost: string;
};

export type CreateInventoryResponse = {
  message?: string;
  item?: InventoryItem;
  productId?: string;
};
