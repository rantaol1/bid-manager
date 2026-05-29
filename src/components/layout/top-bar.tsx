import { UserButton } from '@clerk/nextjs'
import { MobileNav } from '@/components/layout/mobile-nav'

export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
        <span className="text-sm font-semibold lg:hidden">
          Arcwide <span className="text-magenta">Bid Manager</span>
        </span>
      </div>
      <div className="flex items-center gap-4">
        <UserButton appearance={{ elements: { avatarBox: 'h-8 w-8' } }} />
      </div>
    </header>
  )
}
