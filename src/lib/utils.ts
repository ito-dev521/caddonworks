import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount)
}

export function formatBudget(amount: number): string {
  return new Intl.NumberFormat('ja-JP').format(amount) + '円'
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function getStatusColor(status: string): string {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    bidding: 'bg-blue-100 text-blue-800',
    contracted: 'bg-green-100 text-green-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    submitted: 'bg-purple-100 text-purple-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

export function getStatusIcon(status: string): string {
  const icons = {
    draft: '📝',
    bidding: '🏗️',
    contracted: '✅',
    in_progress: '⚡',
    submitted: '📋',
    completed: '🎉',
    cancelled: '❌',
  }
  return icons[status as keyof typeof icons] || '📄'
}

export function getStatusLabel(status: string): string {
  const labels = {
    draft: '下書き',
    bidding: '入札中',
    contracted: '契約済み',
    in_progress: '進行中',
    submitted: '提出済み',
    completed: '完了',
    cancelled: 'キャンセル',
  }
  return labels[status as keyof typeof labels] || status
}