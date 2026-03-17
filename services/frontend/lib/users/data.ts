export async function getLoggedInUser() {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("access_token");

  if (!token) {
    console.log("No access token found");
    return null;
  }

  try {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
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