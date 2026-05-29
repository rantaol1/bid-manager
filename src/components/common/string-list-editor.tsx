'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}

export function StringListEditor({ items, onChange, placeholder }: Props) {
  const [value, setValue] = useState('')

  function add() {
    const trimmed = value.trim()
    if (!trimmed) return
    onChange([...items, trimmed])
    setValue('')
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" onClick={add} aria-label="Add">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={`${item}-${i}`} className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
              <span className="whitespace-pre-wrap">{item}</span>
              <button type="button" onClick={() => remove(i)} aria-label="Remove" className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
