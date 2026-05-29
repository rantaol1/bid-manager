import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { eachDayOfInterval, isWeekend } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateWorkingDays(start: Date, end: Date): number {
  const days = eachDayOfInterval({ start, end })
  return days.filter((day) => !isWeekend(day)).length
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}
