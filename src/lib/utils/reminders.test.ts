import {
  buildReminderFingerprint,
  buildReminderNotificationId,
  clampReminderLeadMinutes,
  formatReminderDueLabel,
  getReminderPlan,
} from './reminders';

describe('reminders', () => {
  it('clamps lead minutes into a safe range', () => {
    expect(clampReminderLeadMinutes(-20)).toBe(0);
    expect(clampReminderLeadMinutes(90.4)).toBe(90);
    expect(clampReminderLeadMinutes(Number.NaN)).toBe(30);
  });

  it('creates a stable positive notification id', () => {
    const first = buildReminderNotificationId('task-123');
    const second = buildReminderNotificationId('task-123');
    const third = buildReminderNotificationId('task-456');

    expect(first).toBe(second);
    expect(first).toBeGreaterThan(0);
    expect(first).not.toBe(third);
  });

  it('returns a scheduled reminder when the reminder time is still ahead', () => {
    const plan = getReminderPlan(
      {
        id: 'task-1',
        dueDate: '2026-03-20T15:00:00.000Z',
        updatedAt: '2026-03-19T10:00:00.000Z',
        status: 'active',
      },
      30,
      new Date('2026-03-20T13:00:00.000Z')
    );

    expect(plan?.kind).toBe('scheduled');
    expect(plan?.notificationId).toBe(buildReminderNotificationId('task-1'));
    expect(plan?.fingerprint).toBe(
      buildReminderFingerprint(
        {
          id: 'task-1',
          dueDate: '2026-03-20T15:00:00.000Z',
          updatedAt: '2026-03-19T10:00:00.000Z',
        },
        30
      )
    );
  });

  it('returns an immediate reminder when the lead window has already started', () => {
    const plan = getReminderPlan(
      {
        id: 'task-2',
        dueDate: '2026-03-20T15:00:00.000Z',
        updatedAt: '2026-03-19T10:00:00.000Z',
        status: 'active',
      },
      60,
      new Date('2026-03-20T14:30:00.000Z')
    );

    expect(plan?.kind).toBe('immediate');
  });

  it('skips completed or overdue tasks', () => {
    expect(
      getReminderPlan(
        {
          id: 'task-3',
          dueDate: '2026-03-20T15:00:00.000Z',
          updatedAt: '2026-03-19T10:00:00.000Z',
          status: 'completed',
        },
        30,
        new Date('2026-03-20T14:00:00.000Z')
      )
    ).toBeNull();

    expect(
      getReminderPlan(
        {
          id: 'task-4',
          dueDate: '2026-03-20T12:00:00.000Z',
          updatedAt: '2026-03-19T10:00:00.000Z',
          status: 'active',
        },
        15,
        new Date('2026-03-20T13:00:00.000Z')
      )
    ).toBeNull();
  });

  it('formats due labels for reminder copy', () => {
    expect(formatReminderDueLabel(new Date('2026-03-20T15:00:00.000Z'), 'en-US')).toContain('Mar');
  });
});
