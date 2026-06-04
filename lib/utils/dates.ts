// lib/utils/dates.ts
import { Timestamp } from "firebase/firestore";

/**
 * Convert Firestore Timestamp or Date to JS Date object.
 */
export function toDate(value: Timestamp | Date | string): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
}

/**
 * Returns true if the match kickoff has already passed (should be locked).
 */
export function isMatchLocked(kickoffTime: Timestamp | Date): boolean {
  return toDate(kickoffTime) <= new Date();
}

/**
 * Format kickoff time for display.
 * @returns e.g. "Sáb 7 Jun · 20:00"
 */
export function formatKickoff(kickoffTime: Timestamp | Date): string {
  const date = toDate(kickoffTime);
  return date.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Returns a countdown string like "2h 34m" or "45s" until kickoff.
 */
export function getCountdown(kickoffTime: Timestamp | Date): string {
  const diff = toDate(kickoffTime).getTime() - Date.now();
  if (diff <= 0) return "En curso";

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Format relative time, e.g. "hace 5 min" or "en 2h"
 */
export function formatRelativeTime(date: Timestamp | Date): string {
  const d = toDate(date);
  const diff = (d.getTime() - Date.now()) / 1000;
  const absDiff = Math.abs(diff);
  const isFuture = diff > 0;

  let label: string;
  if (absDiff < 60) label = `${Math.round(absDiff)}s`;
  else if (absDiff < 3600) label = `${Math.round(absDiff / 60)}min`;
  else if (absDiff < 86400) label = `${Math.round(absDiff / 3600)}h`;
  else label = `${Math.round(absDiff / 86400)}d`;

  return isFuture ? `en ${label}` : `hace ${label}`;
}
