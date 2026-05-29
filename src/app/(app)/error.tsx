'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[App Error]', error.message)
  }, [error])

  return (
    <div className="flex h-96 flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Something went wrong.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
