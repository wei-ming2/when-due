<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { visibleTasks, tasks } from '../stores/tasks';
  import type { Task } from '../services/api';
  import { uiState, type FilterMode, type SortMode } from '../stores/ui';
  import { taskApi } from '../services/api';
  import { queueDeadlineNotificationSync } from '../services/notifications';
  import TaskCard from './TaskCard.svelte';
  import TaskDetailPanel from './TaskDetailPanel.svelte';
  import QuickAddInput from './QuickAddInput.svelte';
  import FilterSidebar from './FilterSidebar.svelte';

  export let onOpenSettings: (() => void) | undefined;

  let quickAddComponent: any = null;
  let detailPanelComponent: { requestClose?: () => Promise<void> } | null = null;
  let hasMounted = false;
  let lastQueryKey = '';
  let selectedTaskId: string | null = null;
  let showSortMenu = false;
  let isResizingSidebar = false;
  let sidebarWrapperEl: HTMLDivElement | null = null;
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
  const sortOptions: Array<{ id: SortMode; label: string; hint: string }> = [
    { id: 'due-date', label: 'Due date', hint: 'Soonest first' },
    { id: 'date-added', label: 'Date added', hint: 'Newest first' },
    { id: 'priority', label: 'Priority', hint: 'High to low' },
  ];

  $: queryKey = `${$uiState.filterMode}:${$uiState.completedRetentionDays}`;
  $: activeTasks = $visibleTasks.filter((task) => task.status !== 'completed');
  $: completedTasks = $visibleTasks.filter((task) => task.status === 'completed');
  $: selectedTask = selectedTaskId ? $tasks.find((task) => task.id === selectedTaskId) ?? null : null;
  $: if (selectedTaskId && !$tasks.find((task) => task.id === selectedTaskId)) {
    selectedTaskId = null;
  }

  async function syncQuery(queryKey: string, force = false) {
    if (!force && queryKey === lastQueryKey) return;

    lastQueryKey = queryKey;
    try {
      await taskApi.archiveCompletedTasks($uiState.completedRetentionDays);
      await tasks.loadTasks($uiState.filterMode, true);
      queueDeadlineNotificationSync();
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

  function startSidebarResize(e: MouseEvent) {
    if (!$uiState.sidebarVisible) return;

    e.preventDefault();
    isResizingSidebar = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function handleSidebarResizeMove(e: MouseEvent) {
    if (!isResizingSidebar || !sidebarWrapperEl) return;

    const { left } = sidebarWrapperEl.getBoundingClientRect();
    uiState.setSidebarWidth(e.clientX - left);
  }

  function stopSidebarResize() {
    if (!isResizingSidebar) return;

    isResizingSidebar = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  function toggleSortMenu() {
    showSortMenu = !showSortMenu;
  }

  function closeSortMenu() {
    showSortMenu = false;
  }

  function setSortMode(mode: SortMode) {
    uiState.setSortMode(mode);
    closeSortMenu();
  }

  async function handleDetailClose() {
    const closingTaskId = selectedTaskId;
    detailPanelComponent = null;
    selectedTaskId = null;
    await tick();

    if (!closingTaskId) return;

    const trigger = document.querySelector(
      `[data-task-notes-toggle="${closingTaskId}"]`
    ) as HTMLButtonElement | null;
    trigger?.focus();
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
      if (e.key === 'Escape') {
        closeSortMenu();
      }
    };

    document.addEventListener('visibilitychange', handleForegroundSync);
    window.addEventListener('focus', handleForegroundSync);
    window.addEventListener('keydown', handleGlobalKeydown);
    window.addEventListener('mousemove', handleSidebarResizeMove);
    window.addEventListener('mouseup', stopSidebarResize);
    return () => {
      clearMaintenanceTimers();
      stopSidebarResize();
      document.removeEventListener('visibilitychange', handleForegroundSync);
      window.removeEventListener('focus', handleForegroundSync);
      window.removeEventListener('keydown', handleGlobalKeydown);
      window.removeEventListener('mousemove', handleSidebarResizeMove);
      window.removeEventListener('mouseup', stopSidebarResize);
    };
  });

  $: if (hasMounted) {
    void syncQuery(queryKey);
  }

  $: currentSortOption =
    sortOptions.find((option) => option.id === $uiState.sortMode) ?? sortOptions[0];
</script>

<div class="focus-dashboard">
  <div
    bind:this={sidebarWrapperEl}
    class="sidebar-wrapper"
    class:hidden={!$uiState.sidebarVisible}
    style={`--sidebar-width: ${$uiState.sidebarWidth}px;`}
  >
    <FilterSidebar />
  </div>

  <button
    class="sidebar-resize-handle"
    class:hidden={!$uiState.sidebarVisible}
    class:active={isResizingSidebar}
    on:mousedown={startSidebarResize}
    aria-label="Resize filters sidebar"
    title="Resize filters sidebar"
  >
    <span class="sidebar-resize-grip" aria-hidden="true"></span>
  </button>

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
        <div class="sort-menu-wrap">
          <button
            class="sort-trigger"
            class:open={showSortMenu}
            on:click={toggleSortMenu}
            aria-haspopup="menu"
            aria-expanded={showSortMenu}
            title={`Sort by ${currentSortOption.label.toLowerCase()}`}
          >
            <span class="sort-trigger-copy">
              <span class="sort-trigger-label">Sort</span>
              <span class="sort-trigger-value">{currentSortOption.label}</span>
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="m7 10 5 5 5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          {#if showSortMenu}
            <div class="sort-menu" role="menu" aria-label="Sort tasks">
              {#each sortOptions as option}
                <button
                  class="sort-menu-option"
                  class:active={$uiState.sortMode === option.id}
                  on:click={() => setSortMode(option.id)}
                >
                  <span class="sort-option-copy">
                    <span class="sort-option-title">{option.label}</span>
                    <span class="sort-option-hint">{option.hint}</span>
                  </span>
                  {#if $uiState.sortMode === option.id}
                    <svg class="sort-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M20 6 9 17l-5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>

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

{#if selectedTask}
  <div class="detail-overlay" role="presentation" transition:fade={{ duration: 120 }}>
    <button
      class="detail-backdrop"
      on:click={() => void detailPanelComponent?.requestClose?.()}
      aria-label="Close notes and nested tasks"
    ></button>
    <div
      class="detail-popover"
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${selectedTask.title}`}
      in:fly={{ y: 10, duration: 170 }}
      out:fade={{ duration: 100 }}
    >
      <TaskDetailPanel
        bind:this={detailPanelComponent}
        task={selectedTask}
        on:close={() => void handleDetailClose()}
      />
    </div>
  </div>
{/if}

{#if showSortMenu}
  <button class="sort-backdrop" on:click={closeSortMenu} aria-label="Close sort menu"></button>
{/if}

<style>
  .focus-dashboard {
    display: flex;
    height: 100%;
    width: 100%;
    overflow: hidden;
    background: var(--bg-primary);
  }

  .sidebar-wrapper {
    width: var(--sidebar-width, 220px);
    min-width: var(--sidebar-width, 220px);
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
    transform: translateX(calc(-1 * var(--sidebar-width, 220px)));
    opacity: 0;
    pointer-events: none;
  }

  .sidebar-resize-handle {
    width: 12px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: col-resize;
    flex-shrink: 0;
    position: relative;
    transition: background-color var(--transition-fast), opacity var(--transition-fast);
  }

  .sidebar-resize-handle.hidden {
    width: 0;
    opacity: 0;
    pointer-events: none;
  }

  .sidebar-resize-handle::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to right,
      transparent 0,
      transparent 4px,
      color-mix(in srgb, var(--border-color) 82%, transparent) 4px,
      color-mix(in srgb, var(--border-color) 82%, transparent) 6px,
      transparent 6px,
      transparent 100%
    );
  }

  .sidebar-resize-handle:hover::before,
  .sidebar-resize-handle.active::before {
    background: linear-gradient(
      to right,
      transparent 0,
      transparent 4px,
      color-mix(in srgb, var(--accent) 75%, transparent) 4px,
      color-mix(in srgb, var(--accent) 75%, transparent) 6px,
      transparent 6px,
      transparent 100%
    );
  }

  .sidebar-resize-grip {
    display: block;
    width: 100%;
    height: 100%;
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

  .sort-menu-wrap {
    position: relative;
    z-index: 30;
  }

  .sort-trigger {
    min-height: 44px;
    padding: 0 12px 0 14px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    display: inline-flex;
    align-items: center;
    gap: 10px;
    box-shadow: var(--shadow-sm);
    transition:
      border-color var(--panel-transition),
      background-color var(--panel-transition),
      color var(--panel-transition),
      box-shadow var(--panel-transition);
  }

  .sort-trigger:hover,
  .sort-trigger.open {
    border-color: color-mix(in srgb, var(--accent) 28%, var(--border-color));
    background: color-mix(in srgb, var(--bg-secondary) 92%, white);
    box-shadow: 0 12px 22px rgba(15, 23, 42, 0.08);
  }

  .sort-trigger-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-width: 0;
  }

  .sort-trigger-label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }

  .sort-trigger-value {
    font-size: 0.84rem;
    font-weight: 650;
    color: var(--text-primary);
    white-space: nowrap;
  }

  .sort-trigger svg {
    width: 16px;
    height: 16px;
    color: var(--text-tertiary);
    flex-shrink: 0;
    transition: transform var(--transition-fast);
  }

  .sort-trigger.open svg {
    transform: rotate(180deg);
  }

  .sort-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 220px;
    padding: 8px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    box-shadow: 0 18px 36px rgba(15, 23, 42, 0.14);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sort-menu-option {
    width: 100%;
    min-height: 52px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    text-align: left;
  }

  .sort-menu-option:hover {
    background: var(--bg-secondary);
  }

  .sort-menu-option.active {
    background: color-mix(in srgb, var(--accent-light) 60%, white);
    border-color: color-mix(in srgb, var(--accent) 22%, var(--border-color));
  }

  .sort-option-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .sort-option-title {
    font-size: 0.84rem;
    font-weight: 650;
    color: var(--text-primary);
  }

  .sort-option-hint {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .sort-option-check {
    width: 16px;
    height: 16px;
    color: var(--accent);
    flex-shrink: 0;
  }

  .sort-backdrop {
    position: fixed;
    inset: 0;
    background: transparent;
    border: none;
    z-index: 20;
  }

  .detail-overlay {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 28px 20px;
    background: rgba(15, 23, 42, 0.12);
    backdrop-filter: blur(8px);
  }

  .detail-backdrop {
    position: absolute;
    inset: 0;
    border: none;
    background: transparent;
  }

  .detail-popover {
    position: relative;
    width: min(620px, calc(100vw - 40px));
    max-height: min(78vh, 760px);
    margin-top: clamp(44px, 8vh, 88px);
    overflow: auto;
    border-radius: calc(var(--radius-lg) + 4px);
    box-shadow: 0 28px 56px rgba(15, 23, 42, 0.18);
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

    .sidebar-resize-handle {
      display: none;
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

  @media (max-width: 900px) {
    .header-actions {
      flex-wrap: wrap;
      justify-content: flex-end;
    }
  }
</style>
