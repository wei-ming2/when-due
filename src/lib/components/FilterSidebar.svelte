<script lang="ts">
  import { uiState } from '../stores/ui';

  let selectedPriorities: Set<string> = new Set($uiState.selectedCategoryId ? [$uiState.selectedCategoryId] : []);
  let showCompleted = $uiState.showCompleted;

  function togglePriority(priority: string) {
    if (selectedPriorities.has(priority)) {
      selectedPriorities.delete(priority);
    } else {
      selectedPriorities.add(priority);
    }
    selectedPriorities = selectedPriorities; // Trigger reactivity
  }

  function toggleShowCompleted() {
    showCompleted = !showCompleted;
    uiState.setShowCompleted(showCompleted);
  }

  function clearFilters() {
    selectedPriorities.clear();
    selectedPriorities = selectedPriorities;
    showCompleted = false;
    uiState.setShowCompleted(false);
  }

  $: hasActiveFilters = selectedPriorities.size > 0 || showCompleted;
</script>

<div class="filter-sidebar">
  <div class="filter-header">
    <h3>Filters</h3>
    {#if hasActiveFilters}
      <button class="clear-btn" on:click={clearFilters}>Clear</button>
    {/if}
  </div>

  <div class="filter-group">
    <label class="filter-group-title">Priority</label>
    <div class="priority-buttons">
      <button
        class="priority-btn high"
        class:active={selectedPriorities.has('high')}
        on:click={() => togglePriority('high')}
        title="High priority"
      >
        High
      </button>
      <button
        class="priority-btn medium"
        class:active={selectedPriorities.has('medium')}
        on:click={() => togglePriority('medium')}
        title="Medium priority"
      >
        Medium
      </button>
      <button
        class="priority-btn low"
        class:active={selectedPriorities.has('low')}
        on:click={() => togglePriority('low')}
        title="Low priority"
      >
        Low
      </button>
    </div>
  </div>

  <div class="filter-group">
    <label class="filter-checkbox">
      <input type="checkbox" bind:checked={showCompleted} on:change={toggleShowCompleted} />
      <span>Show Completed</span>
    </label>
  </div>

  <div class="filter-info">
    <p class="text-sm">Tip: Combine filters to find what you need</p>
  </div>
</div>

<style>
  .filter-sidebar {
    width: 220px;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    height: 100%;
    overflow-y: auto;
  }

  .filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .filter-header h3 {
    margin: 0;
    font-size: var(--font-size-lg);
    color: var(--text-primary);
    font-weight: 600;
  }

  .clear-btn {
    background: none;
    border: none;
    color: var(--accent);
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: 500;
    transition: color var(--transition-fast);
  }

  .clear-btn:hover {
    color: var(--text-primary);
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .filter-group-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .priority-buttons {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .priority-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 2px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .priority-btn:hover {
    border-color: var(--text-primary);
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

  .filter-checkbox {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    cursor: pointer;
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    transition: color var(--transition-fast);
  }

  .filter-checkbox:hover {
    color: var(--accent);
  }

  .filter-checkbox input[type='checkbox'] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--accent);
  }

  .filter-info {
    margin-top: auto;
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-color);
  }

  .text-sm {
    font-size: var(--font-size-sm);
    color: var(--text-tertiary);
    margin: 0;
  }

  @media (max-width: 768px) {
    .filter-sidebar {
      width: 100%;
      border-right: none;
      border-bottom: 1px solid var(--border-color);
      flex-direction: row;
      gap: var(--spacing-lg);
      padding: var(--spacing-md);
      height: auto;
      overflow: visible;
    }

    .priority-buttons {
      flex-direction: row;
    }
  }
</style>
