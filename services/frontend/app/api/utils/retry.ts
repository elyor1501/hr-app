export async function withRetry<T>(
  request: () => Promise<T>,
  retries = 2
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (retries === 0) {
      throw error;
    }
    return withRetry(request, retries - 1);
  }
}
