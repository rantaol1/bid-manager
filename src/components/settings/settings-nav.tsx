'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/settings/rate-card', label: 'Rate card' },
  { href: '/settings/proposal-defaults', label: 'Proposal defaults' },
  { href: '/settings/templates', label: 'Templates' },
  { href: '/settings/templates/decks', label: 'Slide decks' },
  { href: '/settings/templates/pptx', label: 'PowerPoint templates' },
  { href: '/settings/branding', label: 'Branding' },
]

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <div className="flex gap-1 overflow-x-auto border-b">
      {ITEMS.map((it) => {
        const active = pathname === it.href
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              'whitespace-nowrap border-b-2 px-3 py-2 text-sm',
              active ? 'border-magenta font-medium text-magenta' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {it.label}
          </Link>
        )
      })}
    </div>
  )
}
