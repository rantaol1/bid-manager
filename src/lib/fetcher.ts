/** Thin fetch wrapper for client components used with TanStack Query. */
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData
  const res = await fetch(url, {
    ...options,
    headers: {
      // Let the browser set the multipart boundary for FormData uploads.
      ...(options?.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
