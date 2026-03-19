<script lang="ts">
  import { createEventDispatcher, onDestroy, tick } from 'svelte';
  import { subtaskApi, type Subtask, type Task } from '../services/api';
  import { tasks } from '../stores/tasks';

  export let task: Task;

  const dispatch = createEventDispatcher<{ close: void }>();

  let isArchiveConfirming = false;
  let isLoadingSubtasks = false;
  let isAddingSubtask = false;
  let loadedTaskId = '';
  let lastTaskSignature = '';
  let editDescription = '';
  let subtasks: Subtask[] = [];
  let subtaskDrafts: Record<string, string> = {};
  let newSubtaskTitle = '';
  let newSubtaskInput: HTMLInputElement | null = null;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  let descriptionDirty = false;

  function syncFromTask() {
    editDescription = task.description || '';
    descriptionDirty = false;
    isArchiveConfirming = false;
    saveStatus = 'idle';
  }

  function syncSubtaskDrafts() {
    subtaskDrafts = Object.fromEntries(subtasks.map((subtask) => [subtask.id, subtask.title]));
  }

  function syncTaskSubtaskCounts() {
    const subtaskCount = subtasks.length;
    const subtaskCompletedCount = subtasks.filter((subtask) => subtask.completed).length;

    tasks.patchLocal(task.id, {
      subtaskCount,
      subtaskCompletedCount,
    });
  }

  async function loadSubtasks(taskId: string) {
    isLoadingSubtasks = true;

    try {
      subtasks = await subtaskApi.getSubtasks(taskId);
      syncSubtaskDrafts();
      syncTaskSubtaskCounts();
      loadedTaskId = taskId;
    } catch (error) {
      console.error('Failed to load subtasks:', error);
      subtasks = [];
      subtaskDrafts = {};
    } finally {
      isLoadingSubtasks = false;
    }
  }

  $: taskSignature = JSON.stringify({
    id: task.id,
    updatedAt: task.updatedAt,
    description: task.description ?? '',
  });

  $: if (taskSignature !== lastTaskSignature && !descriptionDirty) {
    lastTaskSignature = taskSignature;
    syncFromTask();
  }

  $: if (task.id && task.id !== loadedTaskId) {
    void loadSubtasks(task.id);
  }

  $: orderedSubtasks = [...subtasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.order - b.order;
  });

  $: activeSubtaskCount = orderedSubtasks.filter((subtask) => !subtask.completed).length;

  function clearSaveTimer() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  }

  async function persistDescription(force = false) {
    clearSaveTimer();

    if (!force && !descriptionDirty) return;

    const nextDescription = editDescription.trim() ? editDescription : null;
    const currentDescription = task.description ?? null;

    if ((nextDescription ?? '') === (currentDescription ?? '')) {
      descriptionDirty = false;
      saveStatus = 'saved';
      return;
    }

    saveStatus = 'saving';

    try {
      await tasks.update(task.id, { description: nextDescription });
      descriptionDirty = false;
      saveStatus = 'saved';
    } catch (error) {
      console.error('Failed to save task description:', error);
      saveStatus = 'error';
    }
  }

  function scheduleDescriptionSave() {
    descriptionDirty = true;
    saveStatus = 'idle';
    clearSaveTimer();
    saveTimer = setTimeout(() => {
      void persistDescription();
    }, 500);
  }

  async function handleArchive() {
    if (!isArchiveConfirming) {
      isArchiveConfirming = true;
      return;
    }

    await tasks.delete(task.id);
    dispatch('close');
  }

  async function handleClose() {
    await persistDescription(true);
    dispatch('close');
  }

  async function handleAddSubtask() {
    const title = newSubtaskTitle.trim();
    if (!title) return;

    isAddingSubtask = true;
    try {
      const subtask = await subtaskApi.addSubtask(task.id, title);
      subtasks = [...subtasks, subtask];
      syncSubtaskDrafts();
      syncTaskSubtaskCounts();
      newSubtaskTitle = '';
      await tick();
      newSubtaskInput?.focus();
    } catch (error) {
      console.error('Failed to add subtask:', error);
    } finally {
      isAddingSubtask = false;
    }
  }

  async function handleToggleSubtask(subtask: Subtask) {
    const nextCompleted = !subtask.completed;
    subtasks = subtasks.map((item) =>
      item.id === subtask.id ? { ...item, completed: nextCompleted } : item
    );

    try {
      const result = await subtaskApi.toggleSubtaskComplete(subtask.id, nextCompleted);
      subtasks = subtasks.map((item) =>
        item.id === subtask.id ? { ...item, completed: nextCompleted, updatedAt: result.updatedAt } : item
      );
      syncTaskSubtaskCounts();
    } catch (error) {
      console.error('Failed to update subtask:', error);
      subtasks = subtasks.map((item) =>
        item.id === subtask.id ? { ...item, completed: subtask.completed } : item
      );
    }
  }

  async function handleSaveSubtask(subtask: Subtask) {
    const nextTitle = (subtaskDrafts[subtask.id] || '').trim();
    if (!nextTitle || nextTitle === subtask.title) {
      subtaskDrafts = { ...subtaskDrafts, [subtask.id]: subtask.title };
      return;
    }

    try {
      const result = await subtaskApi.updateSubtask(subtask.id, nextTitle);
      subtasks = subtasks.map((item) =>
        item.id === subtask.id ? { ...item, title: nextTitle, updatedAt: result.updatedAt } : item
      );
      subtaskDrafts = { ...subtaskDrafts, [subtask.id]: nextTitle };
    } catch (error) {
      console.error('Failed to rename subtask:', error);
      subtaskDrafts = { ...subtaskDrafts, [subtask.id]: subtask.title };
    }
  }

  async function handleDeleteSubtask(subtaskId: string) {
    try {
      await subtaskApi.deleteSubtask(subtaskId);
      subtasks = subtasks.filter((subtask) => subtask.id !== subtaskId);
      const nextDrafts = { ...subtaskDrafts };
      delete nextDrafts[subtaskId];
      subtaskDrafts = nextDrafts;
      syncTaskSubtaskCounts();
    } catch (error) {
      console.error('Failed to delete subtask:', error);
    }
  }

  function handleSubtaskKeydown(e: KeyboardEvent, subtask: Subtask) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSaveSubtask(subtask);
      return;
    }

    if (e.key === 'Backspace' && !(subtaskDrafts[subtask.id] || '').trim()) {
      e.preventDefault();
      void handleDeleteSubtask(subtask.id);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      subtaskDrafts = { ...subtaskDrafts, [subtask.id]: subtask.title };
    }
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      void handleClose();
    }
  }

  onDestroy(() => {
    clearSaveTimer();
  });
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

<section class="task-detail-inline" role="group" aria-label="Task notes and subtasks">
  <div class="panel-header">
    <div>
      <p class="panel-kicker">Expanded Task</p>
      <h3>Notes</h3>
    </div>

    <div class="panel-actions">
      {#if saveStatus !== 'idle'}
        <span class="save-status" class:error={saveStatus === 'error'} aria-live="polite">
          {#if saveStatus === 'saving'}
            Saving…
          {:else if saveStatus === 'saved'}
            Saved
          {:else}
            Could not save
          {/if}
        </span>
      {/if}

      <button class="archive-btn" class:confirm={isArchiveConfirming} on:click={handleArchive}>
        {isArchiveConfirming ? 'Confirm Archive' : 'Archive'}
      </button>

      <button class="close-btn" on:click={handleClose} aria-label="Collapse notes and subtasks">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M18 15l-6-6-6 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </div>

  <div class="notes-card">
    <label for={`task-description-${task.id}`}>Description</label>
    <textarea
      id={`task-description-${task.id}`}
      bind:value={editDescription}
      placeholder="Add context, links, or a short plan for this deadline"
      on:input={scheduleDescriptionSave}
      on:blur={() => void persistDescription(true)}
    />
  </div>

  <div class="subtasks-card">
    <div class="subtasks-header">
      <div>
        <p class="subtasks-kicker">Checklist</p>
        <h4>{activeSubtaskCount} open {activeSubtaskCount === 1 ? 'step' : 'steps'}</h4>
      </div>
      {#if isLoadingSubtasks}
        <span class="subtasks-status">Loading…</span>
      {/if}
    </div>

    <form class="subtask-add" on:submit|preventDefault={handleAddSubtask}>
      <span class="subtask-add-icon">+</span>
      <input
        bind:this={newSubtaskInput}
        bind:value={newSubtaskTitle}
        placeholder="Type a step and press Enter"
        disabled={isAddingSubtask}
      />
      {#if isAddingSubtask}
        <span class="subtask-inline-status">Adding…</span>
      {/if}
    </form>

    {#if orderedSubtasks.length === 0 && !isLoadingSubtasks}
      <p class="empty-copy">Break the deadline into a few short steps when you need them.</p>
    {/if}

    {#each orderedSubtasks as subtask (subtask.id)}
      <div class="subtask-row" class:completed={subtask.completed}>
        <button
          class="subtask-checkbox"
          on:click={() => handleToggleSubtask(subtask)}
          aria-label={subtask.completed ? 'Mark subtask incomplete' : 'Mark subtask complete'}
        >
          {#if subtask.completed}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20 6L9 17l-5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          {/if}
        </button>

        <input
          class="subtask-input"
          bind:value={subtaskDrafts[subtask.id]}
          on:blur={() => handleSaveSubtask(subtask)}
          on:keydown={(e) => handleSubtaskKeydown(e, subtask)}
        />

        <button
          class="subtask-delete"
          on:click={() => handleDeleteSubtask(subtask.id)}
          aria-label={`Remove ${subtask.title}`}
        >
          ×
        </button>
      </div>
    {/each}

  </div>
</section>

<style>
  .task-detail-inline {
    margin-top: 6px;
    padding: 16px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    background: color-mix(in srgb, var(--bg-secondary) 97%, white);
    display: flex;
    flex-direction: column;
    gap: 14px;
    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05);
  }

  .panel-header,
  .subtasks-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .panel-kicker,
  .subtasks-kicker {
    margin: 0 0 4px 0;
    color: var(--text-tertiary);
    font-size: 0.76rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .panel-header h3,
  .subtasks-header h4 {
    margin: 0;
    color: var(--text-primary);
  }

  .panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .save-status {
    font-size: 0.78rem;
    font-weight: 650;
    color: var(--text-secondary);
  }

  .save-status.error {
    color: var(--danger);
  }

  .archive-btn,
  .close-btn {
    min-height: 34px;
    border-radius: var(--radius-pill);
    font-size: 0.8rem;
    font-weight: 650;
  }

  .archive-btn {
    padding: 0 12px;
    border: 1px solid rgba(239, 68, 68, 0.22);
    background: rgba(239, 68, 68, 0.08);
    color: var(--danger);
  }

  .archive-btn.confirm {
    background: var(--danger);
    color: white;
    border-color: var(--danger);
  }

  .close-btn {
    width: 34px;
    padding: 0;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-secondary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn svg,
  .subtask-checkbox svg {
    width: 16px;
    height: 16px;
  }

  .notes-card,
  .subtasks-card {
    padding: 14px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
  }

  .notes-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .notes-card label {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .notes-card textarea,
  .subtask-input,
  .subtask-add input {
    width: 100%;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
  }

  .notes-card textarea {
    min-height: 120px;
    resize: vertical;
  }

  .subtasks-status,
  .empty-copy {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-tertiary);
  }

  .subtasks-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .subtask-add {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    border: 1px dashed var(--border-color);
    background: color-mix(in srgb, var(--bg-secondary) 92%, white);
  }

  .subtask-add-icon {
    color: var(--text-tertiary);
    font-size: 1rem;
    font-weight: 700;
    line-height: 1;
  }

  .subtask-add input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    padding: 0;
    box-shadow: none;
  }

  .subtask-add input:focus {
    outline: none;
    box-shadow: none;
  }

  .subtask-inline-status {
    color: var(--text-tertiary);
    font-size: 0.78rem;
    font-weight: 600;
  }

  .subtask-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
  }

  .subtask-row.completed {
    opacity: 0.72;
  }

  .subtask-checkbox {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    padding: 0;
    border: 1.5px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .subtask-input {
    flex: 1;
    min-width: 0;
  }

  .subtask-row.completed .subtask-input {
    text-decoration: line-through;
    color: var(--text-secondary);
  }

  .subtask-delete {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: 50%;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-tertiary);
    font-size: 1rem;
  }

  .subtask-delete:hover {
    color: var(--danger);
    background: rgba(239, 68, 68, 0.08);
  }

  @media (max-width: 768px) {
    .task-detail-inline {
      padding: 14px;
    }

    .panel-header,
    .subtasks-header,
    .panel-actions,
    .subtask-add {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
