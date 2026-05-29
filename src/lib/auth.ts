import { auth, currentUser } from '@clerk/nextjs/server'

export async function requireAuth() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorised')
  return userId
}

export async function getCurrentUser() {
  const user = await currentUser()
  if (!user) return null
  return {
    id: user.id,
    name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    email: user.primaryEmailAddress?.emailAddress ?? null,
    role: (user.publicMetadata?.role as string) || 'contributor',
    imageUrl: user.imageUrl,
  }
}

export async function requireRole(allowedRoles: string[]) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorised')
  if (!allowedRoles.includes(user.role)) throw new Error('Forbidden')
  return user
}
