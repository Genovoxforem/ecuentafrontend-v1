// Loads pages 2..pages of a paged endpoint with a bounded number of requests in flight. The first page is
// fetched by the caller (it carries the page count), so only the remaining pages are loaded here. Results
// come back in page order whatever order the answers arrive in, and the first failure rejects the whole load.
export async function loadRemainingPages<T>(pages: number, loadPage: (page: number) => Promise<T[]>, concurrency = 4): Promise<T[][]> {
  const results: T[][] = []
  let next = 2
  const worker = async () => {
    while (next <= pages) {
      const page = next++
      results[page - 2] = await loadPage(page)
    }
  }
  await Promise.all(Array.from({ length: Math.max(0, Math.min(concurrency, pages - 1)) }, worker))
  return results
}
