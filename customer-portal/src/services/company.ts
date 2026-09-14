import { apiRequest } from "./api";

export type Company = {
  companyId: string;
  businessName: string;
  primaryContactName: string;
  primaryContactEmail?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  status: string;
  plan: string;
  onboardingStatus: string;
  betaApplicationId?: string;
  createdAt?: string;
  updatedAt?: string;
  setupCompletedAt?: string;
};

export type CompanyOnboardingInput = {
  businessName: string;
  primaryContactName: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

type GetCompanyResponse = {
  company: Company;
};

type UpdateCompanyOnboardingResponse = {
  message: string;
  company: Company;
};

export async function getCompany(): Promise<Company> {
  const response = await apiRequest<GetCompanyResponse>(
    "/company",
  );

  return response.company;
}

export async function completeCompanyOnboarding(
  input: CompanyOnboardingInput,
): Promise<Company> {
  const response =
    await apiRequest<UpdateCompanyOnboardingResponse>(
      "/company/onboarding",
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
    );

  return response.company;
}
