import {
  Schedule,
  cancel,
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { get } from 'svelte/store';
import { uiState } from '../stores/ui';
import type { Task } from './api';
import { taskApi } from './api';
import {
  type ReminderPermissionState,
  clampReminderLeadMinutes,
  formatReminderDueLabel,
  getReminderPlan,
} from '../utils/reminders';

interface ReminderCache {
  scheduledIds: number[];
  firedFingerprints: Record<string, string>;
}

interface ReminderSyncResult {
  permission: ReminderPermissionState;
  scheduledCount: number;
  sentImmediateCount: number;
}

const REMINDER_STORAGE_KEY = 'when-due-reminders';
const REMINDER_RETENTION_MS = 1000 * 60 * 60 * 24 * 21;
const REMINDER_GROUP = 'when-due-reminders';

let queuedRequestPermission = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight = false;
let rerunAfterSync = false;

function canUseBrowserNotifications(): boolean {
  return typeof window !== 'undefined' && typeof window.Notification !== 'undefined';
}

function readReminderCache(): ReminderCache {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      scheduledIds: [],
      firedFingerprints: {},
    };
  }

  try {
    const stored = window.localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!stored) {
      return {
        scheduledIds: [],
        firedFingerprints: {},
      };
    }

    const parsed = JSON.parse(stored) as Partial<ReminderCache>;
    return {
      scheduledIds: Array.isArray(parsed.scheduledIds)
        ? parsed.scheduledIds.filter((value): value is number => typeof value === 'number')
        : [],
      firedFingerprints:
        parsed.firedFingerprints && typeof parsed.firedFingerprints === 'object'
          ? parsed.firedFingerprints
          : {},
    };
  } catch (error) {
    console.warn('[notifications] Failed to read reminder cache:', error);
    return {
      scheduledIds: [],
      firedFingerprints: {},
    };
  }
}

function pruneFiredFingerprints(
  firedFingerprints: Record<string, string>,
  now: Date
): Record<string, string> {
  const cutoff = now.getTime() - REMINDER_RETENTION_MS;

  return Object.fromEntries(
    Object.entries(firedFingerprints).filter(([, timestamp]) => {
      const parsed = new Date(timestamp).getTime();
      return Number.isFinite(parsed) && parsed >= cutoff;
    })
  );
}

function writeReminderCache(cache: ReminderCache) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(
      REMINDER_STORAGE_KEY,
      JSON.stringify({
        scheduledIds: [...new Set(cache.scheduledIds)],
        firedFingerprints: pruneFiredFingerprints(cache.firedFingerprints, new Date()),
      })
    );
  } catch (error) {
    console.warn('[notifications] Failed to persist reminder cache:', error);
  }
}

async function cancelManagedNotifications(ids: number[]) {
  if (ids.length === 0) {
    return;
  }

  try {
    await cancel(ids);
  } catch (error) {
    console.warn('[notifications] Failed to cancel scheduled reminders:', error);
  }
}

export async function getDeadlineNotificationPermission(): Promise<ReminderPermissionState> {
  if (!canUseBrowserNotifications()) {
    return 'unsupported';
  }

  try {
    if (await isPermissionGranted()) {
      return 'granted';
    }
  } catch (error) {
    console.warn('[notifications] Failed to read notification permission:', error);
  }

  return window.Notification.permission;
}

export async function ensureDeadlineNotificationPermission(
  interactive: boolean = false
): Promise<boolean> {
  const permission = await getDeadlineNotificationPermission();

  if (permission === 'granted') {
    return true;
  }

  if (!interactive || permission === 'denied' || permission === 'unsupported') {
    return false;
  }

  try {
    const nextPermission = await requestPermission();
    return nextPermission === 'granted';
  } catch (error) {
    console.warn('[notifications] Failed to request notification permission:', error);
    return false;
  }
}

function buildReminderContent(task: Task, dueAt: Date) {
  return {
    title: 'Deadline reminder',
    body: `${task.title} is due ${formatReminderDueLabel(dueAt)}.`,
  };
}

export async function syncDeadlineNotifications(options: {
  requestPermission?: boolean;
} = {}): Promise<ReminderSyncResult> {
  const cache = readReminderCache();
  const settings = get(uiState);

  if (!settings.notificationsEnabled) {
    await cancelManagedNotifications(cache.scheduledIds);
    writeReminderCache({
      scheduledIds: [],
      firedFingerprints: cache.firedFingerprints,
    });

    return {
      permission: await getDeadlineNotificationPermission(),
      scheduledCount: 0,
      sentImmediateCount: 0,
    };
  }

  const permissionGranted = await ensureDeadlineNotificationPermission(options.requestPermission);
  const permission = await getDeadlineNotificationPermission();

  if (!permissionGranted) {
    await cancelManagedNotifications(cache.scheduledIds);
    writeReminderCache({
      scheduledIds: [],
      firedFingerprints: cache.firedFingerprints,
    });

    return {
      permission,
      scheduledCount: 0,
      sentImmediateCount: 0,
    };
  }

  const leadMinutes = clampReminderLeadMinutes(settings.notificationLeadMinutes);
  const allTasks = await taskApi.getTasks('all', false);
  const now = new Date();
  const firedFingerprints = pruneFiredFingerprints(cache.firedFingerprints, now);
  const nextScheduledIds: number[] = [];
  let sentImmediateCount = 0;

  await cancelManagedNotifications(cache.scheduledIds);

  const dueTasks = allTasks
    .filter((task) => task.status === 'active' && task.dueDate)
    .sort((left, right) => {
      const leftDue = left.dueDate ? new Date(left.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const rightDue = right.dueDate ? new Date(right.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return leftDue - rightDue;
    });

  for (const task of dueTasks) {
    const plan = getReminderPlan(task, leadMinutes, now);
    if (!plan) {
      continue;
    }

    const reminder = buildReminderContent(task, plan.dueAt);

    if (plan.kind === 'immediate') {
      if (!firedFingerprints[plan.fingerprint]) {
        sendNotification({
          id: plan.notificationId,
          title: reminder.title,
          body: reminder.body,
          group: REMINDER_GROUP,
          autoCancel: true,
          extra: {
            taskId: task.id,
          },
        });
        firedFingerprints[plan.fingerprint] = now.toISOString();
        sentImmediateCount += 1;
      }

      continue;
    }

    sendNotification({
      id: plan.notificationId,
      title: reminder.title,
      body: reminder.body,
      group: REMINDER_GROUP,
      autoCancel: true,
      schedule: Schedule.at(plan.remindAt),
      extra: {
        taskId: task.id,
      },
    });
    nextScheduledIds.push(plan.notificationId);
  }

  writeReminderCache({
    scheduledIds: nextScheduledIds,
    firedFingerprints,
  });

  return {
    permission,
    scheduledCount: nextScheduledIds.length,
    sentImmediateCount,
  };
}

async function runQueuedDeadlineSync() {
  if (syncInFlight) {
    rerunAfterSync = true;
    return;
  }

  syncInFlight = true;
  const requestPermission = queuedRequestPermission;
  queuedRequestPermission = false;

  try {
    await syncDeadlineNotifications({ requestPermission });
  } catch (error) {
    console.error('[notifications] Failed to sync deadline reminders:', error);
  } finally {
    syncInFlight = false;

    if (rerunAfterSync) {
      rerunAfterSync = false;
      queueDeadlineNotificationSync({ delayMs: 180 });
    }
  }
}

export function queueDeadlineNotificationSync(options: {
  requestPermission?: boolean;
  delayMs?: number;
} = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  if (options.requestPermission) {
    queuedRequestPermission = true;
  }

  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(() => {
    syncTimer = null;
    void runQueuedDeadlineSync();
  }, options.delayMs ?? 220);
}
