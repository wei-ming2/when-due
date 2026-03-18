<script lang="ts">
  import type { Task } from '../services/api';
  import { tasks } from '../stores/tasks';
  import { formatDueDate, getPriorityColor, getPriorityLabel } from '../utils/formatting';

  export let task: Task;
  export let onEdit: (taskId: string) => void;

  let showPriorityMenu = false;

  const handleToggleComplete = async () => {
    const newStatus = task.status === 'completed';
    await tasks.toggleComplete(task.id, !newStatus);
  };

  const handleToggleFocus = async () => {
    await tasks.toggleFocus(task.id, !task.isFocus);
  };

  const handlePriorityChange = async (priority: 'low' | 'medium' | 'high') => {
    showPriorityMenu = false;
    await tasks.update(task.id, { priority });
  };

  const handleClickOutside = () => {
    showPriorityMenu = false;
  };
</script>

<div class="task-card" class:completed={task.status === 'completed'} class:focused={task.isFocus} on:click={() => onEdit(task.id)}>
  <div class="task-header">
    <button class="checkbox" on:click|stopPropagation={handleToggleComplete} aria-label="Mark complete" title="Mark as complete">
      {#if task.status === 'completed'}
        <svg class="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 6L9 17l-5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      {/if}
    </button>

    <div class="task-main">
      <h3 class="task-title">{task.title}</h3>
      {#if task.dueDate}
        <div class="task-due-date">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {formatDueDate(task.dueDate)}
        </div>
      {/if}
    </div>

    <div class="priority-selector" on:click|stopPropagation on:click={() => (showPriorityMenu = !showPriorityMenu)} on:blur={handleClickOutside}>
      <button
        class="priority-badge"
        class:high={task.priority === 'high'}
        class:medium={task.priority === 'medium'}
        class:low={task.priority === 'low'}
        title="Click to change priority"
      >
        {task.priority.charAt(0).toUpperCase()}
      </button>

      {#if showPriorityMenu}
        <div class="priority-menu">
          <button
            class="priority-option high"
            on:click={() => handlePriorityChange('high')}
            class:active={task.priority === 'high'}
          >
            <span class="dot"></span> High
          </button>
          <button
            class="priority-option medium"
            on:click={() => handlePriorityChange('medium')}
            class:active={task.priority === 'medium'}
          >
            <span class="dot"></span> Medium
          </button>
          <button
            class="priority-option low"
            on:click={() => handlePriorityChange('low')}
            class:active={task.priority === 'low'}
          >
            <span class="dot"></span> Low
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

{#if showPriorityMenu}
  <div class="backdrop" on:click={handleClickOutside} />
{/if}

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
    align-items: flex-start;
    gap: 12px;
    position: relative;
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
    margin-top: 2px;
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

  .task-main {
    flex: 1;
    min-width: 0;
  }

  .task-title {
    margin: 0;
    font-size: var(--font-size-base);
    font-weight: 500;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .task-due-date {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .task-due-date svg {
    width: 14px;
    height: 14px;
    opacity: 0.7;
  }

  .priority-selector {
    flex-shrink: 0;
    position: relative;
  }

  .priority-badge {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid;
    background: white;
    font-size: var(--font-size-sm);
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
    margin-top: 2px;
  }

  .priority-badge.high {
    border-color: var(--danger);
    color: var(--danger);
  }

  .priority-badge.high:hover {
    background: rgba(248, 113, 113, 0.1);
  }

  .priority-badge.medium {
    border-color: var(--warning);
    color: var(--warning);
  }

  .priority-badge.medium:hover {
    background: rgba(251, 191, 36, 0.1);
  }

  .priority-badge.low {
    border-color: var(--success);
    color: var(--success);
  }

  .priority-badge.low:hover {
    background: rgba(74, 222, 128, 0.1);
  }

  .priority-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
    z-index: 500;
    overflow: hidden;
  }

  .priority-option {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: transparent;
    color: var(--text-primary);
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: all var(--transition-fast);
    text-align: left;
  }

  .priority-option:hover {
    background: var(--bg-secondary);
  }

  .priority-option.active {
    background: var(--accent-light);
  }

  .priority-option .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .priority-option.high .dot {
    background: var(--danger);
  }

  .priority-option.medium .dot {
    background: var(--warning);
  }

  .priority-option.low .dot {
    background: var(--success);
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 400;
  }
</style>
