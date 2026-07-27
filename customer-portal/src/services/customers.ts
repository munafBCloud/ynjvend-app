import { apiRequest } from "./api";

import type {
  CreateCustomerInput,
  CreateCustomerResponse,
  Customer,
  CustomersResponse,
} from "../types/customer";

export async function getCustomers(): Promise<Customer[]> {
  const data = await apiRequest<CustomersResponse>("/customers");

  if (Array.isArray(data.items)) {
    return data.items;
  }

  if (Array.isArray(data.customers)) {
    return data.customers;
  }

  return [];
}

export async function createCustomer(
  customerInput: CreateCustomerInput,
): Promise<Customer> {
  const data = await apiRequest<CreateCustomerResponse>("/customers", {
    method: "POST",
    body: JSON.stringify(customerInput),
  });

  if (data.customer) {
    return data.customer;
  }

  if (!data.customerId) {
    throw new Error(
      "The customer was created, but the API did not return a customer ID.",
    );
  }

  return {
    customerId: data.customerId,
    businessName: customerInput.businessName,
    contactName: customerInput.contactName,
    phone: customerInput.phone,
    locationAddress: customerInput.locationAddress,
    email: customerInput.email,
  };
}
