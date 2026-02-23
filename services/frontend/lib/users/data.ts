export async function getLoggedInUser() {
  if (typeof window === "undefined") return null

  const token = localStorage.getItem("access_token")

  if (!token) return null

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    )

    if (!res.ok) return null

    return await res.json()
  } catch (error) {
    console.error("User fetch failed:", error)
    return null
  }
}