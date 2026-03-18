<script lang="ts">
  import { uiState } from '../stores/ui';
  import type { ThemeMode } from '../stores/ui';

  export let isOpen = false;

  const handleClose = () => {
    isOpen = false;
  };

  const handleThemeChange = (mode: ThemeMode) => {
    uiState.setThemeMode(mode);
    // Apply the theme to the DOM
    if (mode === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', systemTheme === 'dark');
    } else {
      document.documentElement.classList.toggle('dark', mode === 'dark');
    }
  };

  // Sync theme when theme mode changes
  const unsubscribe = uiState.subscribe(({ themeMode, currentTheme }) => {
    if (typeof window !== 'undefined') {
      if (themeMode === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', systemTheme === 'dark');
      } else {
        document.documentElement.classList.toggle('dark', themeMode === 'dark');
      }
    }
  });

  export const cleanup = () => {
    if (unsubscribe) unsubscribe();
  };
</script>

{#if isOpen}
  <div class="modal-overlay" on:click={handleClose} role="button" tabindex="0">
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2>Settings</h2>
        <button class="close-btn" on:click={handleClose} aria-label="Close settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="settings-group">
          <h3>Appearance</h3>
          <div class="setting-item">
            <label for="theme-select">Theme</label>
            <select id="theme-select" value={$uiState.themeMode} on:change={(e) => handleThemeChange(e.currentTarget.value as ThemeMode)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        <div class="settings-group">
          <h3>View Preferences</h3>
          <div class="setting-item">
            <label for="show-completed">
              <input
                type="checkbox"
                id="show-completed"
                checked={$uiState.showCompleted}
                on:change={(e) => uiState.setShowCompleted(e.currentTarget.checked)}
              />
              Show completed tasks
            </label>
          </div>
        </div>

        <div class="about-section">
          <h3>About</h3>
          <p>Deadline Tracker v0.1.0</p>
          <p class="hint">A focused task management app for daily productivity</p>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    width: 400px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border-color);
  }

  .modal-header h2 {
    margin: 0;
    font-size: var(--font-size-xl);
    color: var(--text-primary);
  }

  .close-btn {
    background: none;
    border: none;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color var(--transition-fast);
  }

  .close-btn:hover {
    color: var(--text-primary);
  }

  .close-btn svg {
    width: 100%;
    height: 100%;
  }

  .modal-body {
    padding: var(--spacing-lg);
  }

  .settings-group {
    margin-bottom: var(--spacing-xl);
  }

  .settings-group h3 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-lg);
    color: var(--text-primary);
  }

  .setting-item {
    margin-bottom: var(--spacing-md);
  }

  .setting-item label {
    display: block;
    margin-bottom: var(--spacing-sm);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .setting-item input[type='checkbox'] {
    margin-right: var(--spacing-sm);
    cursor: pointer;
  }

  select {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: var(--font-family);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  select:hover {
    border-color: var(--accent);
  }

  select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-light);
  }

  .about-section {
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-color);
    margin-top: var(--spacing-xl);
  }

  .about-section h3 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-lg);
    color: var(--text-primary);
  }

  .about-section p {
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .about-section .hint {
    color: var(--text-tertiary);
    font-size: var(--font-size-sm);
  }
</style>
