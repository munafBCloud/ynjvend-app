import { fetchAuthSession } from 'aws-amplify/auth'
import type {
  BetaApplication,
  BetaApplicationListResponse,
} from '../types/betaApplication'

const apiUrl = import.meta.env.VITE_API_URL

if (!apiUrl) {
  throw new Error('Missing VITE_API_URL.')
}

interface BetaApplicationResponse {
  application: BetaApplication
}

interface ApprovalResponse {
  message: string
  application: BetaApplication
}

async function getAccessToken(): Promise<string> {
  const session = await fetchAuthSession()
  const token = session.tokens?.accessToken?.toString()

  if (!token) {
    throw new Error(
      'Authenticated access token is unavailable.',
    )
  }

  return token
}

async function authorizedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken()

  const response = await fetch(
    `${apiUrl}${path}`,
    {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    throw new Error(
      'Your account is not authorized for platform administration.',
    )
  }

  return response
}

export async function getBetaApplications():
  Promise<BetaApplicationListResponse> {
  const response = await authorizedFetch(
    '/admin/beta-applications',
    {
      method: 'GET',
    },
  )

  if (!response.ok) {
    throw new Error(
      `Unable to load beta applications (${response.status}).`,
    )
  }

  return response.json()
}

export async function getBetaApplication(
  applicationId: string,
): Promise<BetaApplication> {
  const response = await authorizedFetch(
    `/admin/beta-applications/${encodeURIComponent(applicationId)}`,
    {
      method: 'GET',
    },
  )

  if (response.status === 404) {
    throw new Error('Beta application was not found.')
  }

  if (!response.ok) {
    throw new Error(
      `Unable to load application (${response.status}).`,
    )
  }

  const data =
    await response.json() as BetaApplicationResponse

  return data.application
}

export async function approveBetaApplication(
  applicationId: string,
): Promise<ApprovalResponse> {
  const response = await authorizedFetch(
    `/admin/beta-applications/${encodeURIComponent(applicationId)}/approve`,
    {
      method: 'POST',
    },
  )

  let data: Partial<ApprovalResponse> & {
    message?: string
  } = {}

  try {
    data = await response.json()
  } catch {
    // Preserve HTTP-level error handling when no JSON body exists.
  }

  if (response.status === 409) {
    throw new Error(
      data.message ||
      'This application cannot be approved from its current state.',
    )
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      `Unable to approve application (${response.status}).`,
    )
  }

  if (!data.application) {
    throw new Error(
      'Approval completed without an application response.',
    )
  }

  return {
    message:
      data.message || 'Application approved.',
    application: data.application,
  }
}
