import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Activity as ActivityIcon, ArrowRightLeft, FilePlus2, Sparkles } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'

export interface ActivityItem {
  id: string
  type: string
  description: string
  createdAt: string
  opportunity: { id: string; name: string } | null
}

const ICONS: Record<string, typeof ActivityIcon> = {
  stage_change: ArrowRightLeft,
  created: Sparkles,
  deliverable: FilePlus2,
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <EmptyState message="No activity yet" hint="Actions across opportunities will appear here." />
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const Icon = ICONS[item.type] ?? ActivityIcon
        return (
          <li key={item.id} className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{item.description}</p>
              <p className="text-xs text-muted-foreground">
                {item.opportunity && (
                  <>
                    <Link href={`/opportunities/${item.opportunity.id}`} className="hover:text-magenta">
                      {item.opportunity.name}
                    </Link>
                    {' · '}
                  </>
                )}
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
