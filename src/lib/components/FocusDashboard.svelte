<script lang="ts">
  import { todaysTasks, tasks } from '../stores/tasks';
  import { uiState } from '../stores/ui';
  import TaskCard from './TaskCard.svelte';
  import QuickAddInput from './QuickAddInput.svelte';
  import CapacityBar from './CapacityBar.svelte';
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
  <div class="dashboard-content">
    <div class="header">
      <div class="header-title">
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

    <CapacityBar availableHours={8} />

    <div class="tasks-section">
      {#if $todaysTasks.length === 0}
        <div class="empty-state">
          <svg class="icon-empty" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 12l2 2 4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="12" cy="12" r="9" stroke-width="2" />
          </svg>
          <p>No tasks for today. You're all set! 🎉</p>
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
        // Task updated, just close the panel
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
  }

  .dashboard-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 24px;
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
  }

  .header {
    margin-bottom: 24px;
  }

  .header-title h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 4px 0;
  }

  .date {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    margin: 0;
  }

  .tasks-section {
    flex: 1;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    color: var(--color-text-secondary);
  }

  .icon-empty {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .tasks-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  @media (max-width: 640px) {
    .dashboard-content {
      padding: 16px;
    }

    .header-title h1 {
      font-size: 1.5rem;
    }
  }
</style>
