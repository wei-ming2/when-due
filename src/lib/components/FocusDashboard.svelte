<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { fade, fly } from 'svelte/transition';
  import { visibleTasks, tasks } from '../stores/tasks';
  import type { Task } from '../services/api';
  import { uiState, type FilterMode } from '../stores/ui';
  import { taskApi } from '../services/api';
  import TaskCard from './TaskCard.svelte';
  import TaskDetailPanel from './TaskDetailPanel.svelte';
  import QuickAddInput from './QuickAddInput.svelte';
  import FilterSidebar from './FilterSidebar.svelte';

  export let onOpenSettings: (() => void) | undefined;

  let quickAddComponent: any = null;
  let hasMounted = false;
  let lastQueryKey = '';
  let selectedTaskId: string | null = null;
  let queryRefreshInterval: ReturnType<typeof setInterval> | null = null;
  let midnightRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  const filterTitles: Record<FilterMode, string> = {
    today: 'Today',
    week: 'Upcoming',
    overdue: 'Overdue',
    all: 'All Tasks',
  };

  const filterHints: Record<FilterMode, string> = {
    today: 'Nothing is due today',
    week: 'Nothing is due in the next 7 days',
    overdue: 'You are fully caught up',
    all: 'No tasks found yet',
  };

  $: queryKey = `${$uiState.filterMode}:${$uiState.completedRetentionDays}`;
  $: activeTasks = $visibleTasks.filter((task) => task.status !== 'completed');
  $: completedTasks = $visibleTasks.filter((task) => task.status === 'completed');
  $: if (selectedTaskId && !$tasks.find((task) => task.id === selectedTaskId)) {
    selectedTaskId = null;
  }

  async function syncQuery(queryKey: string, force = false) {
    if (!force && queryKey === lastQueryKey) return;

    lastQueryKey = queryKey;
    try {
      await taskApi.archiveCompletedTasks($uiState.completedRetentionDays);
      await tasks.loadTasks($uiState.filterMode, true);
    } catch (error) {
      console.error('[FocusDashboard] Failed to sync task query:', error);
    }
  }

  function clearMaintenanceTimers() {
    if (queryRefreshInterval) {
      clearInterval(queryRefreshInterval);
      queryRefreshInterval = null;
    }

    if (midnightRefreshTimer) {
      clearTimeout(midnightRefreshTimer);
      midnightRefreshTimer = null;
    }
  }

  function scheduleMidnightRefresh() {
    if (midnightRefreshTimer) {
      clearTimeout(midnightRefreshTimer);
    }

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 5, 0);

    midnightRefreshTimer = setTimeout(() => {
      void syncQuery(`${$uiState.filterMode}:${$uiState.completedRetentionDays}`, true);
      scheduleMidnightRefresh();
    }, Math.max(1000, nextMidnight.getTime() - now.getTime()));
  }

  function handleForegroundSync() {
    if (document.visibilityState !== 'visible') return;
    void syncQuery(`${$uiState.filterMode}:${$uiState.completedRetentionDays}`, true);
  }

  async function handleTaskCreated(event: CustomEvent<{ task: Task }>) {
    const { task } = event.detail;
    await tick();
    document.getElementById(`task-item-${task.id}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }

  onMount(() => {
    hasMounted = true;
    void syncQuery(queryKey, true);
    scheduleMidnightRefresh();
    queryRefreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void syncQuery(`${$uiState.filterMode}:${$uiState.completedRetentionDays}`, true);
      }
    }, 15 * 60 * 1000);

    // Add global hotkey listener for quick add: "/" or "Ctrl+K" / "Cmd+K"
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't intercept if user is typing in another input
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
        // Allow "/" in future for just the quick add input
        if (e.key === '/' && !target?.className.includes('quick-add')) {
          return;
        }
      }

      if (e.key === '/' && target?.tagName !== 'INPUT' && target?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        quickAddComponent?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        quickAddComponent?.focus();
      }
    };

    document.addEventListener('visibilitychange', handleForegroundSync);
    window.addEventListener('focus', handleForegroundSync);
    window.addEventListener('keydown', handleGlobalKeydown);
    return () => {
      clearMaintenanceTimers();
      document.removeEventListener('visibilitychange', handleForegroundSync);
      window.removeEventListener('focus', handleForegroundSync);
      window.removeEventListener('keydown', handleGlobalKeydown);
    };
  });

  $: if (hasMounted) {
    void syncQuery(queryKey);
  }
</script>

<div class="focus-dashboard">
  <div class="sidebar-wrapper" class:hidden={!$uiState.sidebarVisible}>
    <FilterSidebar />
  </div>

  <div class="dashboard-main">
    <div class="dashboard-header">
      <div class="header-left">
        <button class="sidebar-toggle" on:click={() => uiState.toggleSidebar()} title="Toggle filters">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <div>
          <h1>{filterTitles[$uiState.filterMode]}</h1>
          <p class="date">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>
      <div class="header-actions">
        <button class="settings-btn" on:click={() => onOpenSettings?.()} aria-label="Open settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <div class="capacity-stat">
          <span class="stat-label">Active</span>
          <span class="stat-value">{$visibleTasks.filter((t) => t.status === 'active').length}</span>
        </div>
      </div>
    </div>

    <div class="tasks-section">
      {#if activeTasks.length === 0 && completedTasks.length === 0}
        <div class="empty-state">
          <svg class="icon-empty" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 12l2 2 4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="12" cy="12" r="9" stroke-width="2" />
          </svg>
          <p>No tasks to show</p>
          <p class="empty-hint">{filterHints[$uiState.filterMode]}</p>
        </div>
      {:else}
          <div class="tasks-list">
            {#if activeTasks.length === 0 && completedTasks.length > 0}
              <div class="completed-empty-banner">
                <p>All active deadlines are clear.</p>
              </div>
            {/if}

            {#each activeTasks as task (task.id)}
              <div class="task-item" id={`task-item-${task.id}`}>
                <TaskCard
                  {task}
                  expanded={selectedTaskId === task.id}
                  on:open={() => (selectedTaskId = selectedTaskId === task.id ? null : task.id)}
                />
                {#if selectedTaskId === task.id}
                  <div
                    class="task-detail-wrap"
                    in:fly={{ y: 6, duration: 180, easing: cubicOut }}
                    out:fade={{ duration: 120 }}
                  >
                    <TaskDetailPanel task={task} on:close={() => (selectedTaskId = null)} />
                  </div>
                {/if}
              </div>
            {/each}

            {#if $uiState.showCompleted && completedTasks.length > 0}
              <section class="completed-section">
                <button
                  class="completed-toggle"
                  class:expanded={$uiState.completedSectionExpanded}
                  on:click={() => uiState.toggleCompletedSection()}
                  aria-expanded={$uiState.completedSectionExpanded}
                >
                  <span class="completed-toggle-left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M9 6l6 6-6 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <span>Completed</span>
                  </span>
                  <span class="completed-count">{completedTasks.length}</span>
                </button>

                {#if $uiState.completedSectionExpanded}
                  <div class="completed-list">
                    {#each completedTasks as task (task.id)}
                      <div class="task-item completed-item" id={`task-item-${task.id}`}>
                        <TaskCard
                          {task}
                          expanded={selectedTaskId === task.id}
                          on:open={() => (selectedTaskId = selectedTaskId === task.id ? null : task.id)}
                        />
                        {#if selectedTaskId === task.id}
                          <div
                            class="task-detail-wrap"
                            in:fly={{ y: 6, duration: 180, easing: cubicOut }}
                            out:fade={{ duration: 120 }}
                          >
                            <TaskDetailPanel task={task} on:close={() => (selectedTaskId = null)} />
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}
              </section>
            {/if}
          </div>
      {/if}

      <div class="quick-add-section">
        <h3>Add Task</h3>
        <QuickAddInput bind:this={quickAddComponent} on:created={handleTaskCreated} />
      </div>
    </div>
  </div>

</div>

<style>
  .focus-dashboard {
    display: flex;
    height: 100%;
    width: 100%;
    overflow: hidden;
    background: var(--bg-primary);
  }

  .sidebar-wrapper {
    width: 220px;
    min-width: 220px;
    transition:
      width var(--panel-transition),
      min-width var(--panel-transition),
      transform var(--panel-transition),
      opacity var(--panel-transition);
    overflow: hidden;
    transform: translateX(0);
    opacity: 1;
  }

  .sidebar-wrapper.hidden {
    width: 0;
    min-width: 0;
    transform: translateX(-220px);
    opacity: 0;
    pointer-events: none;
  }

  .dashboard-main {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-primary);
    position: relative;
    min-width: 0;
    width: 100%;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: clamp(var(--spacing-md), 3vw, var(--spacing-xl));
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-primary);
    flex-shrink: 0;
    gap: var(--spacing-md);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    min-width: 0;
    flex: 1;
  }

  .sidebar-toggle {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    cursor: pointer;
    color: var(--text-secondary);
    padding: 8px 10px;
    border-radius: var(--radius-md);
    transition:
      background-color var(--panel-transition),
      border-color var(--panel-transition),
      color var(--panel-transition),
      box-shadow var(--panel-transition),
      transform var(--panel-transition);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-sm);
  }

  .sidebar-toggle:hover {
    background: var(--accent-light);
    border-color: var(--accent);
    color: var(--accent);
    box-shadow: 0 10px 18px rgba(37, 99, 235, 0.12);
    transform: translateY(0);
  }

  .sidebar-toggle svg {
    width: 20px;
    height: 20px;
  }

  .dashboard-header h1 {
    margin: 0 0 4px 0;
    font-size: clamp(20px, 5vw, 28px);
    font-weight: 700;
    color: var(--text-primary);
  }

  .date {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-left: auto;
    flex-shrink: 0;
  }

  .capacity-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--text-tertiary);
    font-weight: 500;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--accent);
  }

  .settings-btn {
    width: 44px;
    height: 44px;
    padding: 0;
    border-radius: 50%;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-sm);
  }

  .settings-btn:hover {
    border-color: var(--accent);
    background: var(--accent-light);
    color: var(--accent);
    box-shadow: 0 12px 24px rgba(37, 99, 235, 0.12);
    transform: translateY(0);
  }

  .settings-btn svg {
    width: 20px;
    height: 20px;
  }

  .tasks-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: clamp(var(--spacing-md), 2vw, var(--spacing-lg));
    min-width: 0;
    -webkit-overflow-scrolling: touch;
  }

  .task-item {
    transform-origin: top center;
    position: relative;
    overflow: visible;
  }

  .task-detail-wrap {
    overflow: visible;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-2xl);
    text-align: center;
    color: var(--text-secondary);
  }

  .icon-empty {
    width: 64px;
    height: 64px;
    margin-bottom: var(--spacing-lg);
    opacity: 0.5;
  }

  .empty-state p {
    margin: 0;
  }

  .empty-hint {
    font-size: var(--font-size-sm);
    color: var(--text-tertiary);
    margin-top: 4px!important;
  }

  .tasks-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 2px 0 2px;
  }

  .completed-empty-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px 18px;
    border-radius: var(--radius-lg);
    border: 1px dashed var(--border-color);
    color: var(--text-secondary);
    background: color-mix(in srgb, var(--bg-secondary) 94%, white);
  }

  .completed-empty-banner p {
    margin: 0;
    font-size: var(--font-size-sm);
  }

  .completed-section {
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 6px;
    border-top: 1px solid color-mix(in srgb, var(--border-color) 88%, transparent);
  }

  .completed-toggle {
    width: 100%;
    min-height: 42px;
    padding: 0 14px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    background: color-mix(in srgb, var(--bg-secondary) 88%, white);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: var(--shadow-sm);
  }

  .completed-toggle:hover {
    border-color: color-mix(in srgb, var(--accent) 20%, var(--border-color));
    color: var(--text-primary);
    transform: translateY(0);
  }

  .completed-toggle-left {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-weight: 650;
  }

  .completed-toggle svg {
    width: 16px;
    height: 16px;
    transition: transform var(--transition-fast);
  }

  .completed-toggle.expanded svg {
    transform: rotate(90deg);
  }

  .completed-count {
    min-width: 28px;
    height: 28px;
    padding: 0 8px;
    border-radius: var(--radius-pill);
    background: var(--bg-primary);
    color: var(--text-primary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .completed-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .quick-add-section {
    margin-top: auto;
    padding-top: var(--spacing-xl);
    border-top: 2px solid var(--border-color);
    flex-shrink: 0;
  }

  .quick-add-section h3 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  @media (max-width: 768px) {
    .focus-dashboard {
      flex-direction: row;
    }

    .sidebar-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dashboard-header {
      padding: var(--spacing-lg);
    }

    .dashboard-header h1 {
      font-size: clamp(18px, 4vw, 24px);
    }

    .tasks-section {
      padding: var(--spacing-md);
    }
  }

  @media (max-width: 640px) {
    .focus-dashboard {
      position: relative;
    }

    .sidebar-wrapper {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      z-index: 100;
      box-shadow: 2px 0 12px rgba(0, 0, 0, 0.3);
    }

    .dashboard-header {
      flex-direction: column;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
    }

    .dashboard-header h1 {
      font-size: clamp(18px, 3.5vw, 22px);
    }

    .header-left {
      gap: var(--spacing-sm);
    }

    .header-actions {
      align-self: flex-start;
      gap: var(--spacing-md);
    }

    .stat-value {
      font-size: 18px;
    }

    .tasks-section {
      padding: var(--spacing-md);
    }

    .quick-add-section {
      margin-top: var(--spacing-lg);
      padding-top: var(--spacing-lg);
    }

    .quick-add-section h3 {
      font-size: var(--font-size-md);
    }
  }
</style>
