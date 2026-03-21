<script lang="ts">
  import { onMount } from 'svelte';
  import FocusDashboard from '$lib/components/FocusDashboard.svelte';
  import SettingsPanel from '$lib/components/SettingsPanel.svelte';
  import ToastStack from '$lib/components/ToastStack.svelte';
  import { categories } from '$lib/stores/categories';

  let showSettings = false;

  onMount(async () => {
    try {
      await categories.load();
    } catch (error) {
      console.error('[+page] Error loading data:', error);
    }

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
    <FocusDashboard onOpenSettings={toggleSettings} />
  </div>
  <SettingsPanel bind:isOpen={showSettings} />
  <ToastStack />
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
</style>
