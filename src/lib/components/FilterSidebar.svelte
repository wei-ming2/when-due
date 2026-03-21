<script lang="ts">
  import { categories } from '../stores/categories';
  import { uiState, type FilterMode } from '../stores/ui';
  import { showErrorToast } from '../stores/toasts';
  import type { Category } from '../services/api';

  const filterModes: Array<{ id: FilterMode; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Upcoming' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'all', label: 'All' },
  ];
  const tagColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];
  let isEditingTags = false;
  let newTagName = '';
  let tagDrafts: Record<string, string> = {};
  let tagError = '';

  function setFilterMode(mode: FilterMode) {
    uiState.setFilterMode(mode);
  }

  function togglePriority(priority: string) {
    uiState.togglePriority(priority);
  }

  function clearFilters() {
    uiState.clearPriorityFilters();
    uiState.setSelectedCategory(undefined);
  }

  function toggleCategory(categoryId: string) {
    uiState.setSelectedCategory($uiState.selectedCategoryId === categoryId ? undefined : categoryId);
  }

  function pickTagColor(index: number): string {
    return tagColors[index % tagColors.length];
  }

  function syncTagDrafts() {
    tagDrafts = Object.fromEntries($categories.map((category) => [category.id, category.name]));
  }

  function toggleTagEditMode() {
    isEditingTags = !isEditingTags;
    tagError = '';
    newTagName = '';
    if (isEditingTags) {
      syncTagDrafts();
    }
  }

  async function addTag() {
    const name = newTagName.trim();
    if (!name) return;

    tagError = '';
    try {
      const category = await categories.create(name, pickTagColor($categories.length));
      tagDrafts = { ...tagDrafts, [category.id]: category.name };
      uiState.setSelectedCategory(category.id);
      newTagName = '';
    } catch (error) {
      tagError = 'Could not create tag. Names must be unique.';
      showErrorToast('Could not create tag.');
    }
  }

  async function saveTag(category: Category) {
    const nextName = (tagDrafts[category.id] || '').trim();
    if (!nextName) {
      tagDrafts = { ...tagDrafts, [category.id]: category.name };
      return;
    }

    if (nextName === category.name) return;

    tagError = '';
    try {
      await categories.updateCategory(category.id, { name: nextName });
    } catch (error) {
      tagError = 'Could not rename tag. Names must be unique.';
      tagDrafts = { ...tagDrafts, [category.id]: category.name };
      showErrorToast('Could not rename tag.');
    }
  }

  function restoreTag(category: Category) {
    tagDrafts = { ...tagDrafts, [category.id]: category.name };
  }

  async function deleteTag(categoryId: string) {
    tagError = '';
    try {
      await categories.delete(categoryId);
      if ($uiState.selectedCategoryId === categoryId) {
        uiState.setSelectedCategory(undefined);
      }

      const nextDrafts = { ...tagDrafts };
      delete nextDrafts[categoryId];
      tagDrafts = nextDrafts;
    } catch (error) {
      tagError = 'Could not delete tag.';
      showErrorToast('Could not delete tag.');
    }
  }

  function handleTagKeydown(e: KeyboardEvent, category: Category) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void saveTag(category);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      restoreTag(category);
    }
  }

  async function moveTag(categoryId: string, direction: 'up' | 'down') {
    const orderedIds = $categories.map((category) => category.id);
    const index = orderedIds.indexOf(categoryId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (index === -1 || targetIndex < 0 || targetIndex >= orderedIds.length) {
      return;
    }

    const nextOrderedIds = [...orderedIds];
    const [movedCategoryId] = nextOrderedIds.splice(index, 1);
    nextOrderedIds.splice(targetIndex, 0, movedCategoryId);

    try {
      tagError = '';
      await categories.reorder(nextOrderedIds);
    } catch (error) {
      tagError = 'Could not move tag.';
      showErrorToast('Could not move tag.');
    }
  }

  $: hasActiveFilters =
    $uiState.selectedPriorities.size > 0 || Boolean($uiState.selectedCategoryId);
</script>

<div class="filter-sidebar">
  <div class="filter-header">
    <h3>Filters</h3>
    {#if hasActiveFilters}
      <button class="clear-btn" on:click={clearFilters}>Clear</button>
    {/if}
  </div>

  <div class="filter-group">
    <div class="filter-group-title" role="heading" aria-level="3">View</div>
    <div class="view-buttons">
      {#each filterModes as filterMode}
        <button
          class="view-btn"
          class:active={$uiState.filterMode === filterMode.id}
          on:click={() => setFilterMode(filterMode.id)}
        >
          {filterMode.label}
        </button>
      {/each}
    </div>
  </div>

  <div class="filter-group">
    <div class="filter-group-title" role="heading" aria-level="3">Priority</div>
    <div class="priority-buttons">
      <button
        class="priority-btn high"
        class:active={$uiState.selectedPriorities.has('high')}
        on:click={() => togglePriority('high')}
      >
        High
      </button>
      <button
        class="priority-btn medium"
        class:active={$uiState.selectedPriorities.has('medium')}
        on:click={() => togglePriority('medium')}
      >
        Medium
      </button>
      <button
        class="priority-btn low"
        class:active={$uiState.selectedPriorities.has('low')}
        on:click={() => togglePriority('low')}
      >
        Low
      </button>
    </div>
  </div>

  <div class="filter-group">
    <div class="tag-group-header">
      <div class="filter-group-title" role="heading" aria-level="3">Tags</div>
      <button class="tag-edit-toggle" on:click={toggleTagEditMode}>
        {isEditingTags ? 'Done' : 'Edit'}
      </button>
    </div>

    {#if isEditingTags}
      <div class="tag-editor" role="list" aria-label="Editable tags">
        {#each $categories as category, index}
          <div class="editable-tag" role="listitem">
            <div class="editable-tag-body">
              <span class="tag-dot" style={`background: ${category.color}`}></span>
              <input
                class="editable-tag-input"
                bind:value={tagDrafts[category.id]}
                on:blur={() => saveTag(category)}
                on:keydown={(e) => handleTagKeydown(e, category)}
              />
            </div>

            <div class="tag-actions">
              <button
                class="tag-order-btn"
                type="button"
                on:click={() => void moveTag(category.id, 'up')}
                aria-label={`Move ${category.name} up`}
                disabled={index === 0}
                title="Move up"
              >
                ↑
              </button>
              <button
                class="tag-order-btn"
                type="button"
                on:click={() => void moveTag(category.id, 'down')}
                aria-label={`Move ${category.name} down`}
                disabled={index === $categories.length - 1}
                title="Move down"
              >
                ↓
              </button>
              <button class="editable-tag-delete" on:click={() => deleteTag(category.id)} aria-label={`Delete ${category.name}`}>
                ×
              </button>
            </div>
          </div>
        {/each}

        <div class="editable-tag new">
          <span class="tag-add">+</span>
          <input
            class="editable-tag-input"
            bind:value={newTagName}
            placeholder="Add tag"
            on:keydown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void addTag();
              }
            }}
          />
        </div>
      </div>
    {:else}
      <div class="tag-list">
        {#if $categories.length === 0}
          <p class="empty-copy">Create a tag like Chem or Algorithms to group deadlines.</p>
        {/if}

        {#each $categories as category}
          <button
            class="tag-chip"
            class:active={$uiState.selectedCategoryId === category.id}
            on:click={() => toggleCategory(category.id)}
            title={`Filter by ${category.name}`}
          >
            <span class="tag-dot" style={`background: ${category.color}`}></span>
            <span class="tag-name">{category.name}</span>
          </button>
        {/each}
      </div>
    {/if}

    {#if tagError}
      <p class="error-copy">{tagError}</p>
    {/if}
  </div>

  <div class="filter-info">
    <p class="text-sm">Tip: click a priority or tag first, then add the task.</p>
  </div>
</div>

<style>
  .filter-sidebar {
    width: 100%;
    min-width: 0;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    padding: calc(var(--spacing-lg) + 16px) var(--spacing-lg) var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .filter-header,
  .tag-group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .filter-header h3 {
    margin: 0;
    font-size: 2rem;
    color: var(--text-primary);
    font-weight: 700;
  }

  .clear-btn,
  .tag-edit-toggle {
    background: none;
    border: none;
    color: var(--accent);
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: 600;
    padding: 0;
  }

  .clear-btn:hover,
  .tag-edit-toggle:hover {
    color: var(--text-primary);
    transform: translateY(0);
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .filter-group-title {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .view-buttons {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-sm);
  }

  .view-btn {
    min-width: 0;
    padding: 0.75rem 0.6rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.15;
  }

  .view-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    transform: translateY(0);
  }

  .view-btn.active {
    background: var(--accent-light);
    border-color: var(--accent);
    color: var(--accent);
  }

  .priority-buttons {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .tag-list,
  .tag-editor {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tag-editor {
    flex-direction: column;
    gap: 0;
  }

  .priority-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 2px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .priority-btn:hover {
    border-color: var(--text-primary);
    transform: translateY(0);
  }

  .priority-btn.high {
    border-color: var(--danger);
    color: var(--danger);
  }

  .priority-btn.high.active {
    background: var(--danger);
    color: white;
  }

  .priority-btn.medium {
    border-color: var(--warning);
    color: var(--warning);
  }

  .priority-btn.medium.active {
    background: var(--warning);
    color: white;
  }

  .priority-btn.low {
    border-color: var(--success);
    color: var(--success);
  }

  .priority-btn.low.active {
    background: var(--success);
    color: white;
  }

  .tag-chip,
  .editable-tag {
    min-width: 0;
    min-height: 38px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0.55rem 0.8rem;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  .tag-chip:hover {
    border-color: var(--accent);
    color: var(--accent);
    transform: translateY(0);
  }

  .tag-chip.active {
    border-color: var(--accent);
    background: var(--accent-light);
    color: var(--accent);
    box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
  }

  .tag-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .tag-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 110px;
  }

  .editable-tag {
    width: 100%;
    gap: 10px;
    justify-content: space-between;
    transition:
      transform var(--transition-fast),
      opacity var(--transition-fast),
      border-color var(--transition-fast),
      box-shadow var(--transition-fast);
  }

  .editable-tag.new {
    border-style: dashed;
    cursor: text;
  }

  .editable-tag-body {
    min-width: 0;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .tag-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .tag-order-btn {
    width: 26px;
    height: 26px;
    padding: 0;
    border: 1px solid var(--border-color);
    border-radius: 999px;
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: 0.82rem;
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
    opacity: 0.42;
    cursor: not-allowed;
  }

  .editable-tag-input {
    width: auto;
    min-width: 0;
    flex: 1;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .editable-tag-input:focus {
    box-shadow: none;
    outline: none;
  }

  .editable-tag-delete {
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: rgba(239, 68, 68, 0.12);
    color: var(--danger);
    font-size: 0.95rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .editable-tag-delete:hover {
    background: var(--danger);
    color: white;
    transform: translateY(0);
  }

  .tag-add {
    color: var(--text-tertiary);
    font-weight: 700;
  }

  .empty-copy,
  .error-copy,
  .text-sm {
    margin: 0;
    font-size: var(--font-size-sm);
  }

  .empty-copy,
  .text-sm {
    color: var(--text-tertiary);
  }

  .error-copy {
    color: var(--danger);
  }

  .filter-info {
    margin-top: auto;
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-color);
  }

  @media (max-width: 768px) {
    .filter-sidebar {
      width: 100%;
      border-right: none;
      border-bottom: 1px solid var(--border-color);
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--spacing-lg);
      padding: var(--spacing-md);
      height: auto;
      overflow: visible;
    }

    .view-buttons {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .priority-buttons {
      flex-direction: row;
    }

    .tag-list,
    .tag-editor {
      width: 100%;
    }

    .tag-chip {
      width: auto;
    }
  }
</style>
