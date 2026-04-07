import { getApiUrl, getAuthToken } from "../api-config";

export async function getLoggedInUser() {
  if (typeof window === "undefined") return null;

  const token = getAuthToken();

  if (!token) {
    return null;
  }

  try {
    const apiUrl = getApiUrl();
    const url = `${apiUrl}/api/v1/auth/me`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (res.status === 401) {
      console.warn("Token expired. Logging out.");
      localStorage.removeItem("access_token");
      return null;
    }

    if (!res.ok) {
      console.warn(`Fetch failed with status ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Network error", error);
    return null;
  }
}