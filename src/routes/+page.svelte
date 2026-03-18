<script lang="ts">
  import { onMount } from 'svelte';
  import FocusDashboard from '$lib/components/FocusDashboard.svelte';
  import { tasks } from '$lib/stores/tasks';
  import { categories } from '$lib/stores/categories';

  onMount(async () => {
    // Load initial data
    await tasks.loadTasks('today');
    await categories.load();
  });
</script>

<main>
  <FocusDashboard />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  main {
    height: 100vh;
    overflow: hidden;
  }
</style>
