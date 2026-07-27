export type Customer = {
  customerId: string;
  businessName: string;
  contactName: string;
  phone: string;
  locationAddress: string;
  email?: string;
  createdAt?: string;
};

export type CreateCustomerInput = {
  businessName: string;
  contactName: string;
  phone: string;
  locationAddress: string;
  email?: string;
};

export type CreateCustomerResponse = {
  message?: string;
  customerId: string;
  customer?: Customer;
};

export type CustomersResponse = {
  items?: Customer[];
  customers?: Customer[];
  count?: number;
};
