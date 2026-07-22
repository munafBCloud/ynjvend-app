const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://ra280rph8l.execute-api.us-east-1.amazonaws.com";

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
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

    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}
