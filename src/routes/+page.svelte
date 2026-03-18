<script lang="ts">
  import { onMount } from 'svelte';
  import FocusDashboard from '$lib/components/FocusDashboard.svelte';
  import SettingsPanel from '$lib/components/SettingsPanel.svelte';
  import { tasks } from '$lib/stores/tasks';
  import { categories } from '$lib/stores/categories';

  let showSettings = false;

  onMount(async () => {
    // Load initial data
    await tasks.loadTasks('today');
    await categories.load();

    // Apply saved theme on mount
    const savedUI = localStorage.getItem('deadline-tracker-ui');
    if (savedUI) {
      const ui = JSON.parse(savedUI);
      if (ui.themeMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (ui.themeMode === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', isDark);
      }
    }
  });

  const toggleSettings = () => {
    showSettings = !showSettings;
  };
</script>

<main>
  <div class="app-container">
    <FocusDashboard />
    <button class="settings-btn" on:click={toggleSettings} aria-label="Open settings">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </div>
  <SettingsPanel bind:isOpen={showSettings} />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  main {
    height: 100vh;
    overflow: hidden;
    position: relative;
  }

  .app-container {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .settings-btn {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    transition: all var(--transition-fast);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .settings-btn:hover {
    background: var(--bg-tertiary);
    border-color: var(--accent);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .settings-btn svg {
    width: 24px;
    height: 24px;
  }
</style>
