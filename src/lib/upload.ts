export const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.presentationml.template', // .potx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
]

export const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

/** Validate an uploaded file's type and size. Returns an error string or null. */
export function validateUpload(file: File | null): string | null {
  if (!file) return 'No file provided'
  if (!ALLOWED_TYPES.includes(file.type)) return 'Invalid file type'
  if (file.size > MAX_FILE_SIZE) return 'File too large (25 MB max)'
  return null
}
