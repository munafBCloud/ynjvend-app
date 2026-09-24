export interface BetaApplication {
  applicationId: string
  businessName?: string
  contactName?: string
  email?: string
  phone?: string
  distributionType?: string
  skuRange?: string
  teamSize?: string
  currentSystem?: string
  biggestProblem?: string
  status?: string
  submittedAt?: string
  provisionedAt?: string
  companyId?: string
}

export interface BetaApplicationListResponse {
  applications: BetaApplication[]
  count: number
}
