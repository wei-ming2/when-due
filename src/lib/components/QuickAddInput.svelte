<script lang="ts">
  import { tasks } from '../stores/tasks';

  let title = '';
  let isAdding = false;

  const handleSubmit = async () => {
    if (!title.trim()) return;

    isAdding = true;
    try {
      await tasks.create(title.trim());
      title = '';
    } catch (error) {
      console.error('Failed to add task:', error);
    } finally {
      isAdding = false;
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
</script>

<form on:submit|preventDefault={handleSubmit} class="quick-add">
  <svg class="icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round" />
  </svg>
  <input
    type="text"
    placeholder="Add a task..."
    bind:value={title}
    on:keydown={handleKeydown}
    disabled={isAdding}
  />
  <button type="submit" disabled={!title.trim() || isAdding} aria-label="Add task">
    {isAdding ? '⏳' : '↵'}
  </button>
</form>

<style>
  .quick-add {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-card-bg);
    margin-top: 16px;
  }

  .icon-plus {
    width: 20px;
    height: 20px;
    color: var(--color-text-secondary);
  }

  input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 1rem;
    color: var(--color-text);
    outline: none;
    font-family: inherit;
  }

  input::placeholder {
    color: var(--color-text-secondary);
  }

  input:disabled {
    opacity: 0.6;
  }

  button {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 4px;
    background: var(--color-primary);
    color: white;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  button:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
