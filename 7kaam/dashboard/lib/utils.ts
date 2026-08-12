import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score?: number | null): string {
  if (score == null) return '—';
  return `${Math.round(score)}/100`;
}

export function tierColor(tier?: string | null): string {
  switch (tier) {
    case 'EXPERT': return 'text-purple-600 bg-purple-100 border-purple-200';
    case 'GOLD':   return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    case 'SILVER': return 'text-gray-600 bg-gray-100 border-gray-200';
    case 'BRONZE': return 'text-orange-700 bg-orange-100 border-orange-200';
    default:       return 'text-gray-500 bg-gray-100 border-gray-200';
  }
}

export function statusColor(status?: string | null): string {
  switch (status) {
    case 'ACTIVE':    return 'text-green-700 bg-green-100';
    case 'PENDING':   return 'text-yellow-700 bg-yellow-100';
    case 'SUSPENDED': return 'text-red-700 bg-red-100';
    default:          return 'text-gray-600 bg-gray-100';
  }
}

export function tradeLabel(trade: string): string {
  return trade.replace('_', ' ');
}

// Video_processing AI decision bands — see types/index.ts AiDecision.
export function aiDecisionColor(decision?: string | null): string {
  switch (decision) {
    case 'strongly_verified':      return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    case 'provisionally_verified': return 'text-teal-700 bg-teal-100 border-teal-200';
    case 'human_review':           return 'text-amber-800 bg-amber-100 border-amber-200';
    case 'needs_resubmission':     return 'text-orange-700 bg-orange-100 border-orange-200';
    case 'insufficient_evidence':  return 'text-gray-600 bg-gray-100 border-gray-200';
    default:                       return 'text-gray-500 bg-gray-100 border-gray-200';
  }
}

export function aiDecisionLabel(decision?: string | null): string {
  if (!decision) return 'Unknown';
  return decision.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
