import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://ra280rph8l.execute-api.us-east-1.amazonaws.com";

type ApiRequestOptions = RequestInit & {
  authenticated?: boolean;
};

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { authenticated = true, headers, ...requestOptions } = options;

  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Content-Type") && requestOptions.body) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (authenticated) {
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken?.toString();

    if (!accessToken) {
      throw new Error("You must sign in to access this resource.");
    }

    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...requestOptions,
    headers: requestHeaders,
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}.`;

    try {
      const errorData = (await response.json()) as {
        message?: string;
        error?: string;
      };

      errorMessage =
        errorData.message ||
        errorData.error ||
        errorMessage;
    } catch {
      // The API did not return JSON.
    }

    if (response.status === 401) {
      errorMessage = "Your session is missing or expired. Please sign in again.";
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
