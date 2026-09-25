export interface Company {
  companyId: string
  businessName?: string
  companyName?: string
  status?: string
  plan?: string
  onboardingStatus?: string

  primaryContactName?: string
  primaryContactEmail?: string

  betaApplicationId?: string

  createdAt?: string
  updatedAt?: string
  setupCompletedAt?: string

  address?: string
  city?: string
  state?: string
  postalCode?: string
  phone?: string
}

export interface CompanyListResponse {
  companies: Company[]
  count: number
}

export interface CompanyDetailResponse {
  company: Company
}
