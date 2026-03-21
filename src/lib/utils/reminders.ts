import type { Task } from '../services/api';

export type ReminderPermissionState = NotificationPermission | 'unsupported';

export interface ReminderPlan {
  kind: 'scheduled' | 'immediate';
  dueAt: Date;
  remindAt: Date;
  notificationId: number;
  fingerprint: string;
}

export function clampReminderLeadMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) {
    return 30;
  }

  return Math.min(Math.max(Math.round(minutes), 0), 60 * 24 * 30);
}

export function buildReminderNotificationId(taskId: string): number {
  // FNV-1a 32-bit hash trimmed to a positive signed integer for notification IDs.
  let hash = 0x811c9dc5;

  for (let index = 0; index < taskId.length; index += 1) {
    hash ^= taskId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 1) || 1;
}

export function buildReminderFingerprint(
  task: Pick<Task, 'id' | 'dueDate' | 'updatedAt'>,
  leadMinutes: number
): string {
  return [
    task.id,
    task.dueDate ?? '',
    task.updatedAt,
    clampReminderLeadMinutes(leadMinutes),
  ].join('|');
}

export function getReminderPlan(
  task: Pick<Task, 'id' | 'dueDate' | 'updatedAt' | 'status'>,
  leadMinutes: number,
  now: Date = new Date()
): ReminderPlan | null {
  if (task.status !== 'active' || !task.dueDate) {
    return null;
  }

  const dueAt = new Date(task.dueDate);
  if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() <= now.getTime()) {
    return null;
  }

  const safeLeadMinutes = clampReminderLeadMinutes(leadMinutes);
  const remindAt = new Date(dueAt.getTime() - safeLeadMinutes * 60_000);

  return {
    kind: remindAt.getTime() <= now.getTime() ? 'immediate' : 'scheduled',
    dueAt,
    remindAt,
    notificationId: buildReminderNotificationId(task.id),
    fingerprint: buildReminderFingerprint(task, safeLeadMinutes),
  };
}

export function formatReminderDueLabel(dueAt: Date, locale: string = 'en-SG'): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(dueAt);
}
