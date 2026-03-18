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
<style>
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
