<script lang="ts">
  import { createEventDispatcher, onDestroy, tick } from 'svelte';
  import { quintOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';
  import { subtaskApi, type Category, type Subtask, type Task } from '../services/api';
  import { tasks } from '../stores/tasks';
  import { categories } from '../stores/categories';
  import { showErrorToast } from '../stores/toasts';
  import {
    deadlineInputToIso,
    formatDeadlineDisplay,
    formatDeadlineInput,
  } from '../utils/date-formatter';
  import { getPriorityLabel } from '../utils/formatting';
  import { formatTimeEstimate, parseTimeEstimateInput } from '../utils/time-estimate';

  export let task: Task;
  export let expanded = false;

  const dispatch = createEventDispatcher<{ open: { id: string } }>();

  let showPriorityMenu = false;
  let editingTitle = false;
  let activeEditor: 'due' | 'estimate' | 'tag' | null = null;
  let isOverdue = false;
  let taskCategories: Category[] = [];
  let titleDraft = '';
  let dueDraft = '';
  let estimateDraft = '';
  let categoryDrafts: string[] = [];
  let estimateError = '';
  let titleInput: HTMLInputElement | null = null;
  let dueInput: HTMLInputElement | null = null;
  let estimateInput: HTMLInputElement | null = null;
  let previewSubtasks: Subtask[] = [];
  let loadedSubtaskTaskId = '';
  let loadedSubtaskSignature = '';
  let subtaskPreviewRequest = 0;
  let isLoadingSubtaskPreview = false;

  $: isOverdue =
    Boolean(task.dueDate) &&
    task.status === 'active' &&
    new Date(task.dueDate as string).getTime() < Date.now();

  $: taskCategoryIds =
    task.categoryIds && task.categoryIds.length > 0
      ? task.categoryIds
      : task.categoryId
        ? [task.categoryId]
        : [];

  $: taskCategories = $categories.filter((category) => taskCategoryIds.includes(category.id));
  $: hasNotes = Boolean(task.description && task.description.trim());
  $: attachmentCount = task.attachmentCount ?? 0;
  $: subtaskCount = task.subtaskCount ?? 0;
  $: subtaskCompletedCount = task.subtaskCompletedCount ?? 0;
  $: subtaskPreviewSignature = `${task.id}:${task.updatedAt}:${subtaskCount}:${subtaskCompletedCount}`;

  $: if (!editingTitle) {
    titleDraft = task.title;
  }

  $: if (activeEditor !== 'due') {
    dueDraft = formatDeadlineInput(task.dueDate);
  }

  $: if (activeEditor !== 'estimate') {
    estimateDraft = task.timeEstimate ? formatTimeEstimate(task.timeEstimate) : '';
    estimateError = '';
  }

  $: if (activeEditor !== 'tag') {
    categoryDrafts = [...taskCategoryIds];
  }

  $: if (subtaskCount === 0) {
    previewSubtasks = [];
    loadedSubtaskTaskId = task.id;
    loadedSubtaskSignature = subtaskPreviewSignature;
    isLoadingSubtaskPreview = false;
  }

  $: if (
    subtaskCount > 0 &&
    (task.id !== loadedSubtaskTaskId || subtaskPreviewSignature !== loadedSubtaskSignature)
  ) {
    void loadSubtaskPreview(task.id, subtaskPreviewSignature);
  }

  $: orderedPreviewSubtasks = [...previewSubtasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.order - b.order;
  });
  $: visiblePreviewSubtasks = orderedPreviewSubtasks.filter((subtask) => !subtask.completed);

  function syncPreviewCounts(nextSubtasks: Subtask[]) {
    tasks.patchLocal(task.id, {
      subtaskCount: nextSubtasks.length,
      subtaskCompletedCount: nextSubtasks.filter((subtask) => subtask.completed).length,
    });
  }

  async function loadSubtaskPreview(taskId: string, signature: string) {
    const requestId = ++subtaskPreviewRequest;
    isLoadingSubtaskPreview = true;

    try {
      const nextSubtasks = await subtaskApi.getSubtasks(taskId);
      if (requestId !== subtaskPreviewRequest || task.id !== taskId) return;
      previewSubtasks = nextSubtasks;
      loadedSubtaskTaskId = taskId;
      loadedSubtaskSignature = signature;
      syncPreviewCounts(nextSubtasks);
    } catch (error) {
      if (requestId !== subtaskPreviewRequest || task.id !== taskId) return;
      console.error('Failed to load nested tasks preview:', error);
    } finally {
      if (requestId === subtaskPreviewRequest && task.id === taskId) {
        isLoadingSubtaskPreview = false;
      }
    }
  }

  async function handleTogglePreviewSubtask(subtask: Subtask) {
    const nextCompleted = !subtask.completed;
    const optimisticSubtasks = previewSubtasks.map((item) =>
      item.id === subtask.id ? { ...item, completed: nextCompleted } : item
    );

    previewSubtasks = optimisticSubtasks;
    syncPreviewCounts(optimisticSubtasks);

    try {
      const result = await subtaskApi.toggleSubtaskComplete(subtask.id, nextCompleted);
      const nextSubtasks = previewSubtasks.map((item) =>
        item.id === subtask.id ? { ...item, completed: nextCompleted, updatedAt: result.updatedAt } : item
      );
      previewSubtasks = nextSubtasks;
      syncPreviewCounts(nextSubtasks);
      tasks.patchLocal(task.id, { updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Failed to update nested task:', error);
      showErrorToast('Could not update nested task.');
      const revertedSubtasks = previewSubtasks.map((item) =>
        item.id === subtask.id ? { ...item, completed: subtask.completed } : item
      );
      previewSubtasks = revertedSubtasks;
      syncPreviewCounts(revertedSubtasks);
    }
  }

  function openDetails() {
    dispatch('open', { id: task.id });
  }

  async function startTitleEditing() {
    activeEditor = null;
    showPriorityMenu = false;
    editingTitle = true;
    await tick();
    titleInput?.focus();
    titleInput?.select();
  }

  function cancelTitleEditing() {
    titleDraft = task.title;
    editingTitle = false;
  }

  async function saveTitle() {
    const nextTitle = titleDraft.trim();

    if (!nextTitle) {
      cancelTitleEditing();
      return;
    }

    if (nextTitle !== task.title) {
      try {
        await tasks.update(task.id, { title: nextTitle });
      } catch (error) {
        console.error('Failed to rename task:', error);
        showErrorToast('Could not rename task.');
        await tick();
        titleInput?.focus();
        titleInput?.select();
        return;
      }
    }

    editingTitle = false;
  }

  async function handleToggleComplete() {
    try {
      await tasks.toggleComplete(task.id, task.status !== 'completed');
    } catch (error) {
      console.error('Failed to update task completion:', error);
      showErrorToast('Could not update completion state.');
    }
  }

  async function handlePriorityChange(priority: 'low' | 'medium' | 'high') {
    showPriorityMenu = false;
    try {
      await tasks.update(task.id, { priority });
    } catch (error) {
      console.error('Failed to update task priority:', error);
      showErrorToast('Could not update priority.');
    }
  }

  async function openEditor(editor: 'due' | 'estimate' | 'tag') {
    editingTitle = false;
    showPriorityMenu = false;
    activeEditor = activeEditor === editor ? null : editor;
    estimateError = '';

    if (activeEditor === null) return;

    await tick();

    if (activeEditor === 'due') dueInput?.focus();
    if (activeEditor === 'estimate') {
      estimateInput?.focus();
      estimateInput?.select();
    }
  }

  function closeEditor() {
    activeEditor = null;
    estimateError = '';
  }

  async function moveDraftCategory(categoryId: string, direction: 'up' | 'down') {
    const orderedIds = [...categoryDrafts];
    const fromIndex = orderedIds.indexOf(categoryId);
    const targetIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;

    if (fromIndex === -1 || targetIndex < 0 || targetIndex >= orderedIds.length) {
      return;
    }

    const [movedId] = orderedIds.splice(fromIndex, 1);
    orderedIds.splice(targetIndex, 0, movedId);
    const previousCategoryIds = [...categoryDrafts];
    categoryDrafts = orderedIds;
    try {
      await tasks.update(task.id, { categoryIds: orderedIds });
    } catch (error) {
      console.error('Failed to reorder task tags:', error);
      categoryDrafts = previousCategoryIds;
      showErrorToast('Could not move tag.');
    }
  }

  async function saveDueDate() {
    const nextValue = dueDraft ? deadlineInputToIso(dueDraft) : null;
    const currentValue = task.dueDate ?? null;

    if (nextValue === currentValue) {
      activeEditor = null;
      return;
    }

    try {
      await tasks.update(task.id, { dueDate: nextValue });
    } catch (error) {
      console.error('Failed to update due date:', error);
      showErrorToast('Could not save due date.');
      await tick();
      dueInput?.focus();
      return;
    }
    activeEditor = null;
  }

  async function clearDueDate() {
    dueDraft = '';
    try {
      await tasks.update(task.id, { dueDate: null });
    } catch (error) {
      console.error('Failed to clear due date:', error);
      dueDraft = formatDeadlineInput(task.dueDate);
      showErrorToast('Could not clear due date.');
      return;
    }
    activeEditor = null;
  }

  async function saveEstimate() {
    const normalized = estimateDraft.trim();

    if (!normalized) {
      try {
        await tasks.update(task.id, { timeEstimate: null });
      } catch (error) {
        console.error('Failed to clear time estimate:', error);
        estimateDraft = task.timeEstimate ? formatTimeEstimate(task.timeEstimate) : '';
        showErrorToast('Could not clear time estimate.');
        await tick();
        estimateInput?.focus();
        return;
      }
      activeEditor = null;
      estimateError = '';
      return;
    }

    const parsed = parseTimeEstimateInput(normalized);
    if (parsed === null) {
      estimateError = 'Use 30m, 2h, or minutes only.';
      await tick();
      estimateInput?.focus();
      return;
    }

    if (parsed !== (task.timeEstimate ?? null)) {
      try {
        await tasks.update(task.id, { timeEstimate: parsed });
      } catch (error) {
        console.error('Failed to update time estimate:', error);
        showErrorToast('Could not save time estimate.');
        await tick();
        estimateInput?.focus();
        return;
      }
    }

    activeEditor = null;
    estimateError = '';
  }

  async function clearEstimate() {
    estimateDraft = '';
    estimateError = '';
    try {
      await tasks.update(task.id, { timeEstimate: null });
    } catch (error) {
      console.error('Failed to clear time estimate:', error);
      estimateDraft = task.timeEstimate ? formatTimeEstimate(task.timeEstimate) : '';
      showErrorToast('Could not clear time estimate.');
      return;
    }
    activeEditor = null;
  }

  async function clearCategory() {
    const previousCategoryIds = [...categoryDrafts];
    categoryDrafts = [];
    try {
      await tasks.update(task.id, { categoryIds: null });
    } catch (error) {
      console.error('Failed to clear tags:', error);
      categoryDrafts = previousCategoryIds;
      showErrorToast('Could not clear tags.');
      return;
    }
    activeEditor = null;
  }

  async function toggleCategory(categoryId: string) {
    const previousCategoryIds = [...categoryDrafts];
    const nextCategoryIds = categoryDrafts.includes(categoryId)
      ? categoryDrafts.filter((id) => id !== categoryId)
      : [...categoryDrafts, categoryId];

    categoryDrafts = nextCategoryIds;
    try {
      await tasks.update(task.id, {
        categoryIds: nextCategoryIds.length > 0 ? nextCategoryIds : null,
      });
    } catch (error) {
      console.error('Failed to update tags:', error);
      categoryDrafts = previousCategoryIds;
      showErrorToast('Could not update tags.');
    }
  }

  function handleClickOutside() {
    showPriorityMenu = false;
    activeEditor = null;
  }

  function handleTitleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void saveTitle();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      cancelTitleEditing();
    }
  }

  function handleEstimateKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void saveEstimate();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      closeEditor();
    }
  }

  function handleWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && activeEditor) {
      e.preventDefault();
      closeEditor();
    }
  }

  onDestroy(() => {
    subtaskPreviewRequest += 1;
  });
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<div
  class="task-card"
  class:completed={task.status === 'completed'}
  class:expanded
  class:overlay-open={Boolean(activeEditor || showPriorityMenu)}
  role="group"
  aria-label={task.title}
>
  <div class="task-header">
    <button
      class="checkbox"
      on:click|stopPropagation={handleToggleComplete}
      aria-label={task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
      title={task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
    >
      {#if task.status === 'completed'}
        <svg class="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 6L9 17l-5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      {/if}
    </button>

    <div class="task-main">
      <div class="title-row">
        {#if editingTitle}
          <input
            bind:this={titleInput}
            class="title-input"
            bind:value={titleDraft}
            on:click|stopPropagation
            on:blur={() => void saveTitle()}
            on:keydown={handleTitleKeydown}
            aria-label="Task title"
          />
        {:else}
          <h3 class="task-title" on:dblclick|stopPropagation={() => void startTitleEditing()}>
            {task.title}
          </h3>
        {/if}

        <button
          class="notes-toggle"
          class:active={expanded}
          class:has-content={hasNotes || subtaskCount > 0 || attachmentCount > 0}
          data-task-notes-toggle={task.id}
          aria-expanded={expanded}
          on:click|stopPropagation={openDetails}
          title={expanded ? 'Hide notes and nested tasks' : 'Show notes and nested tasks'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M8 4h8M6 8h12M6 12h9M6 16h7" stroke-width="2" stroke-linecap="round" />
          </svg>
          {#if hasNotes || subtaskCount > 0 || attachmentCount > 0}
            <span class="notes-indicator"></span>
          {/if}
        </button>
      </div>

      <div class="task-summary">
        {#if task.dueDate}
          <button
            class="summary-pill due"
            class:overdue={isOverdue}
            class:active={activeEditor === 'due'}
            on:click|stopPropagation={() => void openEditor('due')}
            title="Edit due date"
          >
            {formatDeadlineDisplay(task.dueDate)}
          </button>
        {:else}
          <button
            class="summary-icon-button"
            class:active={activeEditor === 'due'}
            on:click|stopPropagation={() => void openEditor('due')}
            title="Add due date"
            aria-label="Add due date"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        {/if}

        {#if task.timeEstimate}
          <button
            class="summary-pill estimate"
            class:active={activeEditor === 'estimate'}
            on:click|stopPropagation={() => void openEditor('estimate')}
            title="Edit time estimate"
          >
            ~{formatTimeEstimate(task.timeEstimate)}
          </button>
        {:else}
          <button
            class="summary-icon-button"
            class:active={activeEditor === 'estimate'}
            on:click|stopPropagation={() => void openEditor('estimate')}
            title="Add time estimate"
            aria-label="Add time estimate"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="8" stroke-width="1.8" />
              <path d="M12 7v5l3 2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        {/if}

        {#if taskCategories.length > 0}
          {#each taskCategories.slice(0, 2) as category (category.id)}
            <button
              class="summary-pill category"
              class:active={activeEditor === 'tag'}
              style={`--tag-color: ${category.color}`}
              on:click|stopPropagation={() => void openEditor('tag')}
              title="Edit tags"
            >
              <span class="tag-dot"></span>
              {category.name}
            </button>
          {/each}
          {#if taskCategories.length > 2}
            <button class="summary-pill category more" on:click|stopPropagation={() => void openEditor('tag')}>
              +{taskCategories.length - 2}
            </button>
          {/if}
        {:else}
          <button
            class="summary-icon-button"
            class:active={activeEditor === 'tag'}
            on:click|stopPropagation={() => void openEditor('tag')}
            title="Add tags"
            aria-label="Add tags"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20 10 12 18l-8-8V4h6l10 10Z" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
            </svg>
          </button>
        {/if}

        {#if subtaskCount > 0}
          <button
            class="summary-pill progress"
            on:click|stopPropagation={openDetails}
            title="Open nested tasks"
          >
            {subtaskCompletedCount}/{subtaskCount}
          </button>
        {/if}
      </div>

      {#if visiblePreviewSubtasks.length > 0 || isLoadingSubtaskPreview}
        <div class="subtask-preview-list">
          {#if isLoadingSubtaskPreview && visiblePreviewSubtasks.length === 0}
            <p class="subtask-preview-loading">Loading nested tasks…</p>
          {/if}

          {#each visiblePreviewSubtasks.slice(0, 5) as subtask (subtask.id)}
            <div class="subtask-preview-row" class:completed={subtask.completed}>
              <span class="subtask-preview-indent" aria-hidden="true"></span>
              <button
                class="subtask-preview-checkbox"
                on:click|stopPropagation={() => handleTogglePreviewSubtask(subtask)}
                aria-label={subtask.completed ? 'Mark nested task incomplete' : 'Mark nested task complete'}
              >
                {#if subtask.completed}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 6L9 17l-5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                {/if}
              </button>
              <button class="subtask-preview-title" on:click|stopPropagation={openDetails}>
                {subtask.title}
              </button>
            </div>
          {/each}

          {#if visiblePreviewSubtasks.length > 5}
            <button class="subtask-preview-more" on:click|stopPropagation={openDetails}>
              +{visiblePreviewSubtasks.length - 5} more nested tasks
            </button>
          {/if}
        </div>
      {/if}

      {#if activeEditor}
        <div
          class="inline-editor"
          class:wide={activeEditor === 'tag'}
          in:fly={{ y: 6, duration: 160, easing: quintOut }}
          out:fly={{ y: -4, duration: 130, easing: quintOut }}
        >
          {#if activeEditor === 'due'}
            <div class="editor-panel">
              <label class="editor-field">
                <span>Due date</span>
                <input
                  bind:this={dueInput}
                  type="datetime-local"
                  bind:value={dueDraft}
                  on:change={() => void saveDueDate()}
                />
              </label>
              <div class="editor-actions">
                <button class="ghost-btn" on:click={clearDueDate}>Clear</button>
                <button class="ghost-btn" on:click={closeEditor}>Done</button>
              </div>
            </div>
          {/if}

          {#if activeEditor === 'estimate'}
            <div class="editor-panel">
              <label class="editor-field">
                <span>Time estimate</span>
                <input
                  bind:this={estimateInput}
                  type="text"
                  inputmode="text"
                  bind:value={estimateDraft}
                  placeholder="30m or 2h"
                  on:blur={() => void saveEstimate()}
                  on:keydown={handleEstimateKeydown}
                />
              </label>
              <div class="editor-actions">
                <button class="ghost-btn" on:click={clearEstimate}>Clear</button>
                <button class="ghost-btn" on:click={closeEditor}>Done</button>
              </div>
              {#if estimateError}
                <p class="editor-error">{estimateError}</p>
              {/if}
            </div>
          {/if}

          {#if activeEditor === 'tag'}
            <div class="editor-panel tag-editor">
              <div class="tag-editor-header">
                <span>Tags</span>
                <button class="close-btn red" on:click={closeEditor} aria-label="Close tags editor">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </button>
              </div>

              <!-- Selected tags -->
              {#if categoryDrafts.length > 0}
                <div class="tag-picker selected-tags" role="list" aria-label="Selected tags">
                  {#each categoryDrafts as categoryId, index}
                    {@const category = $categories.find((c) => c.id === categoryId)}
                    {#if category}
                      <div class="tag-item-selected" role="listitem">
                        <span class="tag-dot" style={`background: ${category.color}`}></span>
                        <span class="tag-name">{category.name}</span>
                        <div class="tag-order-controls">
                          <button
                            class="tag-order-btn"
                            type="button"
                            on:click={() => void moveDraftCategory(categoryId, 'up')}
                            aria-label={`Move ${category.name} up`}
                            disabled={index === 0}
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            class="tag-order-btn"
                            type="button"
                            on:click={() => void moveDraftCategory(categoryId, 'down')}
                            aria-label={`Move ${category.name} down`}
                            disabled={index === categoryDrafts.length - 1}
                            title="Move down"
                          >
                            ↓
                          </button>
                        </div>
                        <button
                          class="tag-remove-btn"
                          on:click={() => void toggleCategory(categoryId)}
                          aria-label={`Remove ${category.name}`}
                        >
                          ×
                        </button>
                      </div>
                    {/if}
                  {/each}
                </div>
              {/if}

              <!-- All available tags -->
              <div class="tag-picker all-tags">
                <div class="tag-picker-label">Add tags:</div>
                {#each $categories as category}
                  {#if !categoryDrafts.includes(category.id)}
                    <button
                      class="tag-option"
                      style={`--tag-color: ${category.color}`}
                      on:click={() => void toggleCategory(category.id)}
                    >
                      <span class="tag-dot"></span>
                      {category.name}
                    </button>
                  {/if}
                {/each}
              </div>

              <div class="editor-actions">
                <button class="ghost-btn" on:click={clearCategory}>Clear All</button>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <div class="task-meta">
      <div class="priority-selector" role="presentation" on:click|stopPropagation>
        <button
          class="priority-badge"
          class:high={task.priority === 'high'}
          class:medium={task.priority === 'medium'}
          class:low={task.priority === 'low'}
          on:click={() => (showPriorityMenu = !showPriorityMenu)}
          aria-label="Change priority"
          title={`Priority: ${getPriorityLabel(task.priority)}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path d="M6 4v16" stroke-width="1.8" stroke-linecap="round" />
            <path
              d="M6 5h9l-2 4 2 4H6"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        {#if showPriorityMenu}
          <div class="priority-menu">
            <button class="priority-option high" on:click={() => handlePriorityChange('high')}>
              {getPriorityLabel('high')}
            </button>
            <button class="priority-option medium" on:click={() => handlePriorityChange('medium')}>
              {getPriorityLabel('medium')}
            </button>
            <button class="priority-option low" on:click={() => handlePriorityChange('low')}>
              {getPriorityLabel('low')}
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

{#if showPriorityMenu || activeEditor}
  <div class="backdrop" role="presentation" on:click={handleClickOutside} />
{/if}

<style>
  .task-card {
    position: relative;
    padding: 14px 16px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    transition:
      border-color var(--transition-normal),
      background-color var(--transition-normal),
      box-shadow var(--transition-normal);
    box-shadow: var(--shadow-sm);
  }

  .task-card.overlay-open {
    z-index: 12;
  }

  .task-card:hover,
  .task-card:focus-within {
    border-color: color-mix(in srgb, var(--accent) 42%, var(--border-color));
    box-shadow: 0 14px 28px rgba(15, 23, 42, 0.06);
  }

  .task-card.completed {
    opacity: 0.78;
  }

  .task-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .checkbox {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    margin-top: 2px;
    border: 1.5px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .checkbox:hover {
    border-color: var(--accent);
    background: var(--accent-light);
  }

  .icon-check {
    width: 12px;
    height: 12px;
    color: var(--accent);
  }

  .task-main {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .title-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    justify-content: space-between;
  }

  .task-title {
    margin: 0;
    min-width: 0;
    font-size: 1.02rem;
    font-weight: 650;
    line-height: 1.35;
    color: var(--text-primary);
    cursor: text;
    word-break: break-word;
  }

  .task-card.completed .task-title {
    color: var(--text-secondary);
    text-decoration: line-through;
  }

  .title-input {
    width: 100%;
    font-size: 1.02rem;
    font-weight: 650;
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    color: var(--text-primary);
    box-shadow: none;
  }

  .title-input:focus {
    outline: none;
    box-shadow: none;
  }

  .notes-toggle {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 50%;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-secondary);
  }

  .notes-toggle.active {
    border-color: color-mix(in srgb, var(--accent) 28%, var(--border-color));
    background: color-mix(in srgb, var(--accent-light) 65%, white);
    color: var(--accent);
  }

  .notes-toggle.has-content:not(.active) {
    border-color: color-mix(in srgb, var(--accent) 16%, var(--border-color));
    color: var(--text-primary);
  }

  .notes-toggle svg {
    width: 14px;
    height: 14px;
  }

  .notes-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    position: absolute;
    margin-left: 10px;
    margin-top: -10px;
  }

  .task-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .subtask-preview-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: -2px;
    padding-left: 6px;
  }

  .subtask-preview-loading,
  .subtask-preview-more {
    margin: 0;
    margin-left: 34px;
    color: var(--text-tertiary);
    font-size: 0.78rem;
  }

  .subtask-preview-more {
    width: fit-content;
    padding: 0;
    border: none;
    background: transparent;
    font-weight: 600;
  }

  .subtask-preview-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 26px;
  }

  .subtask-preview-row.completed .subtask-preview-title {
    color: var(--text-tertiary);
    text-decoration: line-through;
  }

  .subtask-preview-indent {
    width: 12px;
    align-self: stretch;
    border-left: 1px solid color-mix(in srgb, var(--border-color) 88%, transparent);
    flex-shrink: 0;
  }

  .subtask-preview-checkbox {
    width: 16px;
    height: 16px;
    padding: 0;
    border-radius: 5px;
    border: 1.25px solid color-mix(in srgb, var(--border-color) 92%, var(--text-tertiary));
    background: var(--bg-primary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .subtask-preview-checkbox svg {
    width: 11px;
    height: 11px;
    color: var(--accent);
  }

  .subtask-preview-title {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.82rem;
    line-height: 1.3;
    text-align: left;
    word-break: break-word;
  }

  .summary-pill {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    min-height: 32px;
    padding: 0 11px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border-color);
    font-size: 0.8rem;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    gap: 6px;
  }

  .summary-pill.active {
    border-color: color-mix(in srgb, var(--accent) 28%, var(--border-color));
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
  }

  .summary-pill.due {
    background: color-mix(in srgb, var(--accent-light) 55%, white);
    color: var(--text-secondary);
    border-color: color-mix(in srgb, var(--accent) 16%, var(--border-color));
  }

  .summary-pill.due.overdue {
    background: rgba(239, 68, 68, 0.12);
    color: var(--danger);
    border-color: rgba(239, 68, 68, 0.18);
  }

  .summary-pill.estimate {
    background: var(--bg-primary);
    color: var(--text-secondary);
    border-color: var(--border-color);
  }

  .summary-pill.category {
    background: var(--bg-primary);
    color: var(--text-secondary);
    border-color: var(--border-color);
  }

  .summary-pill.category.more {
    color: var(--text-tertiary);
  }

  .summary-pill.progress {
    background: var(--bg-primary);
    color: var(--text-secondary);
    border-color: var(--border-color);
  }

  .tag-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--tag-color, var(--accent));
    flex-shrink: 0;
  }

  .summary-icon-button {
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 50%;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-tertiary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .summary-icon-button:hover,
  .summary-icon-button.active {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 30%, var(--border-color));
    background: color-mix(in srgb, var(--accent-light) 70%, white);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
  }

  .summary-icon-button svg {
    width: 14px;
    height: 14px;
  }

  .inline-editor {
    position: absolute;
    top: calc(100% - 4px);
    left: 48px;
    width: min(360px, calc(100vw - 96px));
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border-radius: calc(var(--radius-md) + 2px);
    border: 1px solid var(--border-color);
    background: color-mix(in srgb, var(--bg-primary) 92%, white);
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.14);
    z-index: 40;
  }

  .inline-editor.wide {
    width: min(420px, calc(100vw - 96px));
  }

  .editor-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .editor-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .editor-field span {
    font-size: 0.74rem;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .editor-field input {
    width: 100%;
    background: var(--bg-secondary);
  }

  .editor-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ghost-btn {
    min-height: 34px;
    padding: 0 12px;
    border-radius: var(--radius-pill);
    font-size: 0.8rem;
    font-weight: 600;
  }

  .ghost-btn {
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-secondary);
  }

  .editor-error {
    width: 100%;
    margin: -2px 0 0 0;
    font-size: 0.78rem;
    color: var(--danger);
  }

  .tag-editor {
    width: 100%;
  }

  .tag-editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .tag-editor-header span {
    font-size: 0.74rem;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .tag-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tag-option {
    min-height: 32px;
    padding: 0 12px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .tag-picker.selected-tags {
    flex-direction: column;
    gap: 0;
    margin-bottom: 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--accent) 4%, var(--bg-primary));
    padding: 8px 0;
  }

  .tag-item-selected {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border-color);
    transition:
      transform 140ms var(--easing-smooth),
      opacity 140ms var(--easing-smooth),
      box-shadow 140ms var(--easing-smooth),
      background-color 140ms var(--easing-smooth);
  }

  .tag-item-selected:last-child {
    border-bottom: none;
  }

  .tag-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .tag-order-controls {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .tag-order-btn {
    width: 24px;
    height: 24px;
    padding: 0;
    border: 1px solid var(--border-color);
    border-radius: 999px;
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-size: 0.78rem;
    font-weight: 700;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .tag-order-btn:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent-light) 70%, white);
  }

  .tag-order-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .tag-remove-btn {
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-tertiary);
    font-size: 1.1rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background-color 140ms var(--easing-smooth),
      color 140ms var(--easing-smooth);
  }

  .tag-remove-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: var(--danger);
  }

  .tag-picker.all-tags {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tag-picker-label {
    width: 100%;
    font-size: 0.74rem;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .close-btn {
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-secondary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background-color 140ms var(--easing-smooth),
      color 140ms var(--easing-smooth);
  }

  .close-btn:hover {
    background: rgba(0, 0, 0, 0.04);
    color: var(--text-primary);
  }

  .close-btn.red {
    color: var(--text-tertiary);
  }

  .close-btn.red:hover {
    background: rgba(239, 68, 68, 0.12);
    color: var(--danger);
  }

  .close-btn svg {
    width: 16px;
    height: 16px;
  }

  .tag-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .task-meta {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    flex-shrink: 0;
  }

  .priority-selector {
    position: relative;
  }

  .priority-badge {
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: 50%;
    border: 1.5px solid;
    background: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .priority-badge svg {
    width: 15px;
    height: 15px;
  }

  .priority-badge.high {
    border-color: var(--danger);
    color: var(--danger);
    background: rgba(239, 68, 68, 0.08);
  }

  .priority-badge.medium {
    border-color: var(--warning);
    color: var(--warning);
    background: rgba(245, 158, 11, 0.1);
  }

  .priority-badge.low {
    border-color: var(--success);
    color: var(--success);
    background: rgba(16, 185, 129, 0.1);
  }

  .priority-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    width: 144px;
    padding: 6px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    box-shadow: 0 18px 36px rgba(15, 23, 42, 0.14);
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 500;
  }

  .priority-option {
    width: 100%;
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid transparent;
    border-radius: var(--radius-pill);
    background: transparent;
    text-align: left;
    font-size: 0.8rem;
    font-weight: 650;
  }

  .priority-option.high {
    color: var(--danger);
  }

  .priority-option.medium {
    color: var(--warning);
  }

  .priority-option.low {
    color: var(--success);
  }

  .priority-option:hover {
    background: var(--bg-secondary);
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 10;
  }

  @media (max-width: 768px) {
    .task-card {
      padding: 12px 14px;
    }

    .task-header {
      flex-wrap: wrap;
    }

    .task-meta {
      width: 100%;
      justify-content: flex-end;
    }

    .inline-editor,
    .inline-editor.wide {
      left: 0;
      width: min(100%, 420px);
    }

    .title-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .tag-editor-header {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
