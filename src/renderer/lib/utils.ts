import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function notifyTasksChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tasks:changed'))
  }
}

export const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-neutral-500',
  2: 'bg-primary-500',
  3: 'bg-warning-500',
  4: 'bg-destructive-500',
}
