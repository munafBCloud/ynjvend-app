export type Customer = {
  customerId: string;
  businessName: string;
  contactName: string;
  phone: string;
  locationAddress: string;
  email?: string;
  createdAt?: string;
};

export type CustomersResponse = {
  items: Customer[];
  customers?: Customer[];
  count?: number;
};
