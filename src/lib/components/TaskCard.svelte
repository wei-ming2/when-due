<script lang="ts">
  import type { Task } from '../services/api';
  import { tasks } from '../stores/tasks';
  import { formatDueDate, getPriorityColor, getPriorityLabel } from '../utils/formatting';

  export let task: Task;
  export let onEdit: (taskId: string) => void;

  const handleToggleComplete = async () => {
    const newStatus = task.status === 'completed';
    await tasks.toggleComplete(task.id, !newStatus);
  };

  const handleToggleFocus = async () => {
    await tasks.toggleFocus(task.id, !task.isFocus);
  };
</script>

<div class="task-card" class:completed={task.status === 'completed'} class:focused={task.isFocus}>
  <div class="task-header">
    <button class="checkbox" on:click={handleToggleComplete} aria-label="Mark complete">
      {#if task.status === 'completed'}
        <svg class="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 6L9 17l-5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      {/if}
    </button>
    <div class="task-title" on:click={() => onEdit(task.id)}>
      {task.title}
    </div>
    <div class="task-priority" class:high={task.priority === 'high'} class:medium={task.priority === 'medium'} class:low={task.priority === 'low'}>
      {getPriorityLabel(task.priority)}
    </div>
  </div>

  <div class="task-meta">
    {#if task.timeEstimate}
      <span class="meta-item">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="9" stroke-width="2" />
          <polyline points="12 6 12 12 16 14" stroke-width="2" stroke-linecap="round" />
        </svg>
        {task.timeEstimate}m
      </span>
    {/if}
    {#if task.dueDate}
      <span class="meta-item">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2" />
          <path d="M16 2v4M8 2v4M3 10h18" stroke-width="2" />
        </svg>
        {formatDueDate(task.dueDate)}
      </span>
    {/if}
  </div>
</div>

<style>
  .task-card {
    padding: 12px 16px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    margin-bottom: 8px;
    cursor: pointer;
    transition: all var(--transition-normal);
  }

  .task-card:hover {
    border-color: var(--accent);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    background: var(--bg-tertiary);
  }

  .task-card.completed {
    opacity: 0.6;
  }

  .task-card.completed .task-title {
    text-decoration: line-through;
    color: var(--text-secondary);
  }

  .task-card.focused {
    border-color: var(--accent);
    background: var(--accent-light);
  }

  .task-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .checkbox {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border: 2px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }

  .checkbox:hover {
    border-color: var(--accent);
    background: var(--accent-light);
  }

  .icon-check {
    width: 16px;
    height: 16px;
    color: var(--accent);
  }

  .task-title {
    flex: 1;
    font-weight: 500;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }

  .task-title:hover {
    color: var(--accent);
  }

  .task-priority {
    flex-shrink: 0;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: 600;
    text-transform: uppercase;
  }

  .task-priority.high {
    background: rgba(248, 113, 113, 0.15);
    color: var(--danger);
  }

  .task-priority.medium {
    background: rgba(251, 191, 36, 0.15);
    color: var(--warning);
  }

  .task-priority.low {
    background: rgba(74, 222, 128, 0.15);
    color: var(--success);
  }

  .task-meta {
    display: flex;
    gap: 16px;
    margin-top: 8px;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }


  .icon {
    width: 14px;
    height: 14px;
    opacity: 0.6;
  }
</style>
