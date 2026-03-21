<script lang="ts">
  import { onDestroy } from 'svelte';
  import { uiState } from '../stores/ui';
  import type { ThemeMode } from '../stores/ui';
  import {
    ensureDeadlineNotificationPermission,
    getDeadlineNotificationPermission,
    queueDeadlineNotificationSync,
  } from '../services/notifications';
  import type { ReminderPermissionState } from '../utils/reminders';

  export let isOpen = false;

  let notificationsBusy = false;
  let notificationPermission: ReminderPermissionState = 'default';
  let notificationStatus = '';
  let wasOpen = false;

  const handleClose = () => {
    isOpen = false;
  };

  const handleThemeChange = (mode: ThemeMode) => {
    uiState.setThemeMode(mode);
    // Apply the theme to the DOM
    if (mode === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', systemTheme === 'dark');
    } else {
      document.documentElement.classList.toggle('dark', mode === 'dark');
    }
  };

  // Sync theme when theme mode changes
  const unsubscribe = uiState.subscribe(({ themeMode }) => {
    if (typeof window !== 'undefined') {
      if (themeMode === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', systemTheme === 'dark');
      } else {
        document.documentElement.classList.toggle('dark', themeMode === 'dark');
      }
    }
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });

  function handleRetentionChange(e: Event) {
    const target = e.target as HTMLInputElement;
    uiState.setCompletedRetentionDays(Number(target.value));
  }

  async function refreshNotificationPermission() {
    notificationPermission = await getDeadlineNotificationPermission();
    notificationStatus =
      notificationPermission === 'granted'
        ? $uiState.notificationsEnabled
          ? $uiState.notificationLeadMinutes > 0
            ? `When Due will remind you ${$uiState.notificationLeadMinutes} minutes before a deadline.`
            : 'When Due will remind you exactly when a deadline is due.'
          : 'Deadline reminders are allowed on this device.'
        : notificationPermission === 'denied'
          ? 'Notifications are blocked. Re-enable them in system settings to use deadline reminders.'
          : notificationPermission === 'unsupported'
            ? 'Notifications are not available in this environment.'
            : 'Enable reminders to let When Due ask for notification permission.';
  }

  async function handleNotificationsChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const enabled = target.checked;

    if (!enabled) {
      uiState.setNotificationsEnabled(false);
      notificationStatus = 'Deadline reminders are turned off.';
      queueDeadlineNotificationSync({ delayMs: 0 });
      return;
    }

    notificationsBusy = true;
    const granted = await ensureDeadlineNotificationPermission(true);
    await refreshNotificationPermission();

    if (granted) {
      uiState.setNotificationsEnabled(true);
      notificationStatus =
        $uiState.notificationLeadMinutes > 0
          ? `When Due will remind you ${$uiState.notificationLeadMinutes} minutes before a deadline.`
          : 'When Due will remind you exactly when a deadline is due.';
      queueDeadlineNotificationSync({ delayMs: 0 });
    } else {
      uiState.setNotificationsEnabled(false);
    }

    notificationsBusy = false;
  }

  function handleLeadMinutesChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const minutes = Number(target.value);
    uiState.setNotificationLeadMinutes(minutes);
    if ($uiState.notificationsEnabled) {
      notificationStatus =
        minutes > 0
          ? `When Due will remind you ${minutes} minutes before a deadline.`
          : 'When Due will remind you exactly when a deadline is due.';
      queueDeadlineNotificationSync({ delayMs: 0 });
    }
  }

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  $: if (isOpen && !wasOpen) {
    wasOpen = true;
    void refreshNotificationPermission();
  }

  $: if (!isOpen) {
    wasOpen = false;
  }
</script>

{#if isOpen}
  <div class="modal-overlay" on:click|self={handleClose} on:keydown={handleKeydown} role="presentation" tabindex="-1">
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="modal-header">
        <h2 id="settings-title">Settings</h2>
        <button class="close-btn" on:click={handleClose} aria-label="Close settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="settings-group">
          <h3>Appearance</h3>
          <div class="setting-item">
            <div class="setting-label">Theme</div>
            <div class="theme-toggle" role="group" aria-label="Theme">
              <button
                class="theme-btn"
                class:active={$uiState.themeMode === 'light'}
                on:click={() => handleThemeChange('light')}
              >
                Light
              </button>
              <button
                class="theme-btn"
                class:active={$uiState.themeMode === 'dark'}
                on:click={() => handleThemeChange('dark')}
              >
                Dark
              </button>
              <button
                class="theme-btn"
                class:active={$uiState.themeMode === 'system'}
                on:click={() => handleThemeChange('system')}
              >
                System
              </button>
            </div>
          </div>
        </div>

        <div class="settings-group">
          <h3>Deadline Reminders</h3>
          <div class="setting-item">
            <label for="enable-notifications">
              <input
                type="checkbox"
                id="enable-notifications"
                checked={$uiState.notificationsEnabled}
                disabled={notificationsBusy || notificationPermission === 'unsupported'}
                on:change={handleNotificationsChange}
              />
              Enable deadline reminders
            </label>
            <p class="setting-hint">{notificationStatus}</p>
          </div>

          <div class="setting-item">
            <label for="notification-lead-minutes">Remind me before a deadline (minutes)</label>
            <input
              id="notification-lead-minutes"
              type="number"
              min="0"
              max="43200"
              step="5"
              value={$uiState.notificationLeadMinutes}
              disabled={!$uiState.notificationsEnabled}
              on:change={handleLeadMinutesChange}
            />
            <p class="setting-hint">Use `0` to notify right when the deadline is due.</p>
          </div>
        </div>

        <div class="settings-group">
          <h3>Task Defaults</h3>
          <div class="setting-item">
            <div class="setting-label">Default priority for new tasks</div>
            <div class="theme-toggle" role="group" aria-label="Default priority">
              <button
                class="theme-btn low"
                class:active={$uiState.defaultPriority === 'low'}
                on:click={() => uiState.setDefaultPriority('low')}
              >
                Low
              </button>
              <button
                class="theme-btn medium"
                class:active={$uiState.defaultPriority === 'medium'}
                on:click={() => uiState.setDefaultPriority('medium')}
              >
                Medium
              </button>
              <button
                class="theme-btn high"
                class:active={$uiState.defaultPriority === 'high'}
                on:click={() => uiState.setDefaultPriority('high')}
              >
                High
              </button>
            </div>
            <p class="setting-hint">
              This is used when quick add does not include `!high`, `!medium`, or `!low`.
            </p>
          </div>
        </div>

        <div class="settings-group">
          <h3>Task Lifecycle</h3>
          <div class="setting-item">
            <label for="show-completed">
              <input
                type="checkbox"
                id="show-completed"
                checked={$uiState.showCompleted}
                on:change={(e) => uiState.setShowCompleted(e.currentTarget.checked)}
              />
              Show completed tasks
            </label>
          </div>

          <div class="setting-item">
            <label for="completed-retention-days">Auto-archive completed tasks after (days)</label>
            <input
              id="completed-retention-days"
              type="number"
              min="0"
              max="365"
              step="1"
              value={$uiState.completedRetentionDays}
              on:change={handleRetentionChange}
            />
            <p class="setting-hint">Set this to `0` if you want completed items archived immediately.</p>
          </div>
        </div>

        <div class="about-section">
          <h3>About</h3>
          <p>When Due v0.1.0</p>
          <p class="hint">A focused desktop app for tracking deadlines without the usual clutter.</p>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    width: 400px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border-color);
  }

  .modal-header h2 {
    margin: 0;
    font-size: var(--font-size-xl);
    color: var(--text-primary);
  }

  .close-btn {
    background: none;
    border: none;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color var(--transition-fast);
  }

  .close-btn:hover {
    color: var(--text-primary);
  }

  .close-btn svg {
    width: 100%;
    height: 100%;
  }

  .modal-body {
    padding: var(--spacing-lg);
  }

  .settings-group {
    margin-bottom: var(--spacing-xl);
  }

  .settings-group h3 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-lg);
    color: var(--text-primary);
  }

  .setting-item {
    margin-bottom: var(--spacing-md);
  }

  .setting-item label {
    display: block;
    margin-bottom: var(--spacing-sm);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .setting-label {
    margin-bottom: var(--spacing-sm);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .setting-item input[type='checkbox'] {
    margin-right: var(--spacing-sm);
    cursor: pointer;
  }

  .setting-item input[type='number']:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .theme-toggle {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .theme-btn {
    padding: 0.75rem 0.9rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-weight: 600;
  }

  .theme-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    transform: translateY(0);
  }

  .theme-btn.active {
    border-color: var(--accent);
    background: var(--accent-light);
    color: var(--accent);
    box-shadow: 0 10px 18px rgba(37, 99, 235, 0.12);
  }

  .theme-btn.low.active {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 12%, white);
    color: var(--success);
    box-shadow: 0 10px 18px rgba(16, 185, 129, 0.12);
  }

  .theme-btn.medium.active {
    border-color: var(--warning);
    background: color-mix(in srgb, var(--warning) 14%, white);
    color: var(--warning);
    box-shadow: 0 10px 18px rgba(245, 158, 11, 0.14);
  }

  .theme-btn.high.active {
    border-color: var(--danger);
    background: color-mix(in srgb, var(--danger) 12%, white);
    color: var(--danger);
    box-shadow: 0 10px 18px rgba(239, 68, 68, 0.12);
  }

  .setting-item input[type='number'] {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: var(--font-family);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .setting-item input[type='number']:hover {
    border-color: var(--accent);
  }

  .setting-item input[type='number']:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-light);
  }

  .setting-hint {
    margin: var(--spacing-xs) 0 0 0;
    color: var(--text-tertiary);
    font-size: var(--font-size-sm);
  }

  .about-section {
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-color);
    margin-top: var(--spacing-xl);
  }

  .about-section h3 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-lg);
    color: var(--text-primary);
  }

  .about-section p {
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .about-section .hint {
    color: var(--text-tertiary);
    font-size: var(--font-size-sm);
  }
</style>
