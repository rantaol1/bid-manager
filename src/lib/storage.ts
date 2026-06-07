import { put, del, list, get } from '@vercel/blob'

export async function uploadFile(file: File, folder: string) {
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const blob = await put(`${folder}/${safeName}`, file, { access: 'private' })
  return { url: blob.url, fileName: file.name, size: file.size, mimeType: file.type }
}

export async function deleteFile(url: string) {
  await del(url)
}

/**
 * Fetch a private blob's contents server-side. Returns a readable stream and
 * metadata, or null if the blob no longer exists. Downloads must be proxied
 * through the server because the store is private (blob URLs are not public).
 */
export async function getFile(url: string) {
  const result = await get(url, { access: 'private' })
  if (!result) return null
  return { stream: result.stream, contentType: result.blob.contentType, size: result.blob.size }
}

/** Fetch a private blob fully into a Buffer (for server-side processing, e.g. templating). */
export async function getFileBuffer(url: string): Promise<Buffer | null> {
  const result = await getFile(url)
  if (!result) return null
  const reader = (result.stream as ReadableStream<Uint8Array>).getReader()
  const chunks: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)))
}

export async function listFiles(folder: string) {
  const result = await list({ prefix: folder })
  return result.blobs
}
