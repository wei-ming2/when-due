<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { tasks } from '../stores/tasks';
  import type { Task } from '../services/api';

  export let task: Task;

  const dispatch = createEventDispatcher();

  let isEditing = false;
  let editTitle = task.title;
  let editDescription = task.description || '';
  let editDueDate = task.dueDate?.split('T')[0] || '';
  let editPriority = task.priority;

  const handleSave = async () => {
    isEditing = false;
    await tasks.update(task.id, {
      title: editTitle,
      description: editDescription || undefined,
      dueDate: editDueDate || undefined,
      priority: editPriority,
    });
    dispatch('updated');
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      await tasks.delete(task.id);
      dispatch('close');
    }
  };

  const handleClose = () => {
    isEditing = false;
    editTitle = task.title;
    editDescription = task.description || '';
    editDueDate = task.dueDate?.split('T')[0] || '';
    editPriority = task.priority;
    dispatch('close');
  };
</script>

<div class="detail-panel-overlay" on:click={handleClose}>
  <div class="detail-panel" on:click={(e) => e.stopPropagation()}>
    <div class="panel-header">
      <h2>Task Details</h2>
      <button class="close-btn" on:click={handleClose}>✕</button>
    </div>

    <div class="panel-content">
      <div class="form-group">
        <label>Title</label>
        {#if isEditing}
          <input type="text" bind:value={editTitle} placeholder="Task title" />
        {:else}
          <p>{task.title}</p>
        {/if}
      </div>

      <div class="form-group">
        <label>Description</label>
        {#if isEditing}
          <textarea bind:value={editDescription} placeholder="Task description" />
        {:else}
          <p>{task.description || 'No description'}</p>
        {/if}
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Due Date</label>
          {#if isEditing}
            <input type="date" bind:value={editDueDate} />
          {:else}
            <p>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</p>
          {/if}
        </div>

        <div class="form-group">
          <label>Priority</label>
          {#if isEditing}
            <select bind:value={editPriority}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          {:else}
            <p class="priority" class:high={task.priority === 'high'} class:medium={task.priority === 'medium'} class:low={task.priority === 'low'}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </p>
          {/if}
        </div>
      </div>

      {#if task.timeEstimate}
        <div class="form-group">
          <label>Time Estimate</label>
          <p>{task.timeEstimate} minutes</p>
        </div>
      {/if}

      <div class="form-group">
        <label>Status</label>
        <p>{task.status === 'completed' ? '✓ Completed' : 'Active'}</p>
      </div>
    </div>

    <div class="panel-actions">
      {#if isEditing}
        <button class="btn-secondary" on:click={handleClose}>Cancel</button>
        <button class="btn-primary" on:click={handleSave}>Save</button>
      {:else}
        <button class="btn-secondary" on:click={handleDelete}>Delete</button>
        <button class="btn-primary" on:click={() => (isEditing = true)}>Edit</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .detail-panel-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .detail-panel {
    background: var(--color-card-bg);
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--color-border);
  }

  .panel-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--color-text);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s ease;
  }

  .close-btn:hover {
    background: var(--color-hover-bg);
  }

  .panel-content {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group label {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  .form-group input,
  .form-group textarea,
  .form-group select {
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-bg);
    color: var(--color-text);
    font-family: inherit;
    font-size: 1rem;
  }

  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }

  .form-group p {
    margin: 0;
    padding: 8px 0;
    color: var(--color-text);
  }

  .priority {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .priority.high {
    background: rgba(239, 68, 68, 0.1);
    color: rgb(239, 68, 68);
  }

  .priority.medium {
    background: rgba(249, 115, 22, 0.1);
    color: rgb(249, 115, 22);
  }

  .priority.low {
    background: rgba(107, 114, 128, 0.1);
    color: rgb(107, 114, 128);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .panel-actions {
    display: flex;
    gap: 12px;
    padding: 20px;
    border-top: 1px solid var(--color-border);
  }

  .btn-primary,
  .btn-secondary {
    flex: 1;
    padding: 10px 16px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: var(--color-primary);
    color: white;
  }

  .btn-primary:hover {
    background: var(--color-primary-hover);
  }

  .btn-secondary {
    background: var(--color-border);
    color: var(--color-text);
  }

  .btn-secondary:hover {
    background: var(--color-hover-bg);
  }
</style>
