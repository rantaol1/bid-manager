'use client'

import { useUser } from '@clerk/nextjs'

/** Returns whether the signed-in user is an admin. */
export function useIsAdmin() {
  const { user } = useUser()
  return (user?.publicMetadata?.role as string) === 'admin'
}

/** Read-only banner shown to non-admins on settings pages. */
export function AdminNotice() {
  const isAdmin = useIsAdmin()
  if (isAdmin) return null
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      You have read-only access. Admin role is required to save changes.
    </div>
  )
}
