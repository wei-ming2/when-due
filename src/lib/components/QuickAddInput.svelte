<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { tasks } from '../stores/tasks';
  import { uiState, type FilterMode } from '../stores/ui';
  import { categories } from '../stores/categories';
  import type { Task } from '../services/api';
  import { parseTaskInput } from '../utils/deadline-parser';
  import { formatDeadlineDisplay } from '../utils/date-formatter';
  import { getPriorityLabel } from '../utils/formatting';
  import { formatTimeEstimate } from '../utils/time-estimate';
  import { getTaskFilterMode, matchesTaskFilterMode } from '../utils/task-views';

  let title = '';
  let isAdding = false;
  let inputElement: HTMLInputElement;
  let activeTag = undefined;
  let activePriority: 'low' | 'medium' | 'high' = 'medium';
  let hasDefaults = false;
  let previewTitle = '';
  let previewPriority: 'low' | 'medium' | 'high' = 'medium';
  let previewDeadline: string | null = null;
  let previewEstimate: number | null = null;
  let previewReady = false;
  let pendingAdds = 0;

  const dispatch = createEventDispatcher<{ created: { task: Task } }>();

  // Export focus function for global hotkeys
  export function focus() {
    inputElement?.focus();
    inputElement?.select();
  }

  function getDefaultPriority(): 'low' | 'medium' | 'high' {
    if ($uiState.selectedPriorities.size !== 1) return 'medium';
    if ($uiState.selectedPriorities.has('high')) return 'high';
    if ($uiState.selectedPriorities.has('medium')) return 'medium';
    if ($uiState.selectedPriorities.has('low')) return 'low';
    return 'medium';
  }

  async function submitParsedTask(
    taskTitle: string,
    deadline: string | null,
    priority: 'low' | 'medium' | 'high',
    timeEstimateMinutes: number | null,
    categoryIds?: string[],
    optimistic: boolean = true
  ) {
    pendingAdds += 1;
    isAdding = pendingAdds > 0;

    try {
      const newTask = await tasks.create(
        taskTitle,
        undefined,
        deadline ?? undefined,
        priority,
        timeEstimateMinutes ?? undefined,
        categoryIds,
        {
          addToStore: optimistic,
          optimistic,
        }
      );

      if (!optimistic) {
        const targetFilterMode = getTaskFilterMode(newTask);
        if (targetFilterMode !== $uiState.filterMode) {
          uiState.setFilterMode(targetFilterMode);
        }
        await tasks.loadTasks(targetFilterMode, true);
      }

      dispatch('created', { task: newTask });
    } catch (error) {
      console.error('Failed to add task:', error);
    } finally {
      pendingAdds = Math.max(0, pendingAdds - 1);
      isAdding = pendingAdds > 0;
    }
  }

  const handleSubmit = () => {
    const rawInput = title.trim();
    if (!rawInput) return;

    const {
      title: taskTitle,
      deadline,
      priority,
      prioritySpecified,
      timeEstimateMinutes,
    } = parseTaskInput(rawInput);

    if (!taskTitle.trim()) {
      return;
    }

    const resolvedPriority = prioritySpecified ? priority : getDefaultPriority();
    const categoryIds = $uiState.selectedCategoryId ? [$uiState.selectedCategoryId] : undefined;
    const draftTask: Task = {
      id: 'draft',
      title: taskTitle,
      dueDate: deadline ?? undefined,
      priority: resolvedPriority,
      timeEstimate: timeEstimateMinutes ?? undefined,
      categoryId: categoryIds?.[0],
      categoryIds,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const shouldStayInCurrentView = matchesTaskFilterMode(draftTask, $uiState.filterMode);

    title = '';
    void submitParsedTask(
      taskTitle,
      deadline,
      resolvedPriority,
      timeEstimateMinutes,
      categoryIds,
      shouldStayInCurrentView
    );
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  $: activeTag = $categories.find((category) => category.id === $uiState.selectedCategoryId);
  $: activePriority =
    $uiState.selectedPriorities.size === 1 ? getDefaultPriority() : 'medium';
  $: hasDefaults =
    Boolean($uiState.selectedCategoryId) || $uiState.selectedPriorities.size === 1;
  $: {
    if (!title.trim()) {
      previewTitle = '';
      previewPriority = getDefaultPriority();
      previewDeadline = null;
      previewEstimate = null;
      previewReady = false;
    } else {
      const parsed = parseTaskInput(title.trim());
      previewTitle = parsed.title.trim();
      previewPriority = parsed.prioritySpecified ? parsed.priority : getDefaultPriority();
      previewDeadline = parsed.deadline;
      previewEstimate = parsed.timeEstimateMinutes;
      previewReady = true;
    }
  }
</script>

<div class="quick-add-wrapper">
  {#if hasDefaults && !previewReady}
    <div class="quick-add-defaults">
      {#if $uiState.selectedPriorities.size === 1}
        <span class="default-pill priority {activePriority}">
          Priority: {getPriorityLabel(activePriority)}
        </span>
      {/if}
      {#if activeTag}
        <span class="default-pill tag" style={`--tag-color: ${activeTag.color}`}>Tag: {activeTag.name}</span>
      {/if}
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit} class="quick-add">
    <svg class="icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round" />
    </svg>
    <input
      bind:this={inputElement}
      type="text"
      placeholder="Add a task... e.g. 'Chem hw ~2h @24 2300'"
      bind:value={title}
      on:keydown={handleKeydown}
    />
    <button type="submit" disabled={!title.trim()} aria-label="Add task">
      {pendingAdds > 0 ? `↵ ${pendingAdds}` : '↵'}
    </button>
  </form>
  <p class="quick-add-hint">Use `~` for an estimate, `@` for a deadline, and `!high`, `!medium`, or `!low` for priority.</p>
  {#if previewReady}
    <div class="quick-add-preview" class:invalid={!previewTitle}>
      {#if previewTitle}
        <span class="preview-title">{previewTitle}</span>
      {:else}
        <span class="preview-error">Add a task title before saving.</span>
      {/if}

      {#if previewDeadline}
        <span class="default-pill due">Due {formatDeadlineDisplay(previewDeadline)}</span>
      {/if}

      {#if previewEstimate}
        <span class="default-pill estimate">~{formatTimeEstimate(previewEstimate)}</span>
      {/if}

      <span class="default-pill priority {previewPriority}">
        {getPriorityLabel(previewPriority)}
      </span>

      {#if activeTag}
        <span class="default-pill tag" style={`--tag-color: ${activeTag.color}`}>{activeTag.name}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .quick-add-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .quick-add-defaults {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .default-pill {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  .default-pill.priority {
    border: 2px solid transparent;
  }

  .default-pill.priority.high {
    border-color: var(--danger);
    background: var(--danger);
    color: white;
  }

  .default-pill.priority.medium {
    border-color: var(--warning);
    background: var(--warning);
    color: white;
  }

  .default-pill.priority.low {
    border-color: var(--success);
    background: var(--success);
    color: white;
  }

  .default-pill.tag {
    background: color-mix(in srgb, var(--tag-color, var(--accent)) 14%, white);
    color: var(--tag-color, var(--accent));
    border: 1px solid color-mix(in srgb, var(--tag-color, var(--accent)) 24%, white);
  }

  .default-pill.due {
    background: rgba(37, 99, 235, 0.1);
    color: var(--accent);
    border: 1px solid rgba(37, 99, 235, 0.18);
  }

  .default-pill.estimate {
    background: rgba(245, 158, 11, 0.12);
    color: #b45309;
    border: 1px solid rgba(245, 158, 11, 0.18);
  }

  .quick-add {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    margin-top: 16px;
    transition: all var(--transition-fast);
  }

  .quick-add-hint {
    margin: 0;
    color: var(--text-tertiary);
    font-size: 0.82rem;
  }

  .quick-add-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    border: 1px dashed var(--border-color);
    background: color-mix(in srgb, var(--bg-secondary) 90%, white);
  }

  .quick-add-preview.invalid {
    border-color: rgba(239, 68, 68, 0.24);
    background: rgba(239, 68, 68, 0.04);
  }

  .preview-title {
    font-weight: 700;
    color: var(--text-primary);
  }

  .preview-error {
    font-weight: 600;
    color: var(--danger);
  }

  .quick-add:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-light);
  }

  .icon-plus {
    width: 20px;
    height: 20px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: var(--font-size-base);
    color: var(--text-primary);
    outline: none;
    font-family: inherit;
  }

  input::placeholder {
    color: var(--text-tertiary);
  }

  input:disabled {
    opacity: 0.6;
  }

  button {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--accent);
    color: white;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }

  button:hover:not(:disabled) {
    background: var(--accent);
    transform: scale(1.05);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
