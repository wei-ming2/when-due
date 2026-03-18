<script lang="ts">
  import { todaysTasks, tasks } from '../stores/tasks';
  import { uiState } from '../stores/ui';
  import TaskCard from './TaskCard.svelte';
  import QuickAddInput from './QuickAddInput.svelte';
  import CapacityBar from './CapacityBar.svelte';
  import FilterSidebar from './FilterSidebar.svelte';
  import TaskDetailPanel from './TaskDetailPanel.svelte';
  import { formatDueDate } from '../utils/formatting';
  import type { Task } from '../services/api';

  let selectedTaskId: string | undefined;
  let showDetailPanel = false;

  $: selectedTask = selectedTaskId ? $todaysTasks.find((t) => t.id === selectedTaskId) : undefined;

  const handleTaskEdit = (taskId: string) => {
    selectedTaskId = taskId;
    showDetailPanel = true;
  };

  const handleClosePanel = () => {
    showDetailPanel = false;
    selectedTaskId = undefined;
  };

  // Load tasks on mount
</script>

<div class="focus-dashboard">
  {#if $uiState.sidebarVisible}
    <FilterSidebar />
  {/if}

  <div class="dashboard-main">
    <div class="dashboard-header">
      <div class="header-left">
        <button class="sidebar-toggle" on:click={() => uiState.toggleSidebar()} title="Toggle filters">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <div>
          <h1>Today's Focus</h1>
          <p class="date">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>
      <div class="capacity-compact">
        <div class="capacity-stat">
          <span class="stat-label">Tasks</span>
          <span class="stat-value">{$todaysTasks.filter((t) => t.status === 'active').length}</span>
        </div>
      </div>
    </div>

    <div class="tasks-section">
      <div class="test-info">
        <strong>Debug Info:</strong> Raw tasks loaded: {$tasks.length} | Filtered today: {$todaysTasks.length} | Show completed: {$uiState.showCompleted ? 'ON' : 'OFF'} | Priority filters: {$uiState.selectedPriorities.size}
      </div>
      {#if $todaysTasks.length === 0}
        <div class="empty-state">
          <svg class="icon-empty" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 12l2 2 4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="12" cy="12" r="9" stroke-width="2" />
          </svg>
          <p>No tasks to show</p>
          <p class="empty-hint">Create one to get started</p>
        </div>
      {:else}
        <div class="tasks-list">
          {#each $todaysTasks as task (task.id)}
            <TaskCard {task} onEdit={handleTaskEdit} />
          {/each}
        </div>
      {/if}

      <QuickAddInput />
    </div>
  </div>

  {#if showDetailPanel && selectedTask}
    <TaskDetailPanel
      task={selectedTask}
      on:close={handleClosePanel}
      on:updated={() => {
        handleClosePanel();
      }}
    />
  {/if}
</div>

<style>
  .focus-dashboard {
    display: flex;
    height: 100%;
    overflow: hidden;
    background: var(--bg-primary);
  }

  .dashboard-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: var(--spacing-xl);
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-primary);
  }

  .header-left {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-lg);
  }

  .sidebar-toggle {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 4px 8px;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 2px;
  }

  .sidebar-toggle:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .sidebar-toggle svg {
    width: 20px;
    height: 20px;
  }

  .dashboard-header h1 {
    margin: 0 0 4px 0;
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .date {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .capacity-compact {
    display: flex;
    gap: var(--spacing-xl);
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

  .test-info {
    padding: 12px 16px;
    background: var(--bg-secondary);
    border: 2px solid var(--accent);
    border-radius: var(--radius-md);
    margin-bottom: 16px;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .test-info strong {
    color: var(--accent);
  }

  .tasks-section {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-lg);
    min-width: 0;
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
    gap: 0;
    margin-bottom: var(--spacing-lg);
  }

  @media (max-width: 1024px) {
    .focus-dashboard {
      flex-direction: column;
    }

    .sidebar-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dashboard-header {
      padding: var(--spacing-lg);
    }

    .tasks-section {
      max-width: 100%;
      padding: var(--spacing-md);
    }
  }

  @media (max-width: 640px) {
    .dashboard-header {
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .dashboard-header h1 {
      font-size: 24px;
    }

    .capacity-compact {
      align-self: flex-start;
    }
  }
</style>
