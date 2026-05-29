import { put, del, list } from '@vercel/blob'

export async function uploadFile(file: File, folder: string) {
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const blob = await put(`${folder}/${safeName}`, file, { access: 'public' })
  return { url: blob.url, fileName: file.name, size: file.size, mimeType: file.type }
}

export async function deleteFile(url: string) {
  await del(url)
}

export async function listFiles(folder: string) {
  const result = await list({ prefix: folder })
  return result.blobs
}
