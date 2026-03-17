<script>
  import { onMount } from 'svelte';
</script>

<main>
  <h1>Welcome to Deadline Tracker</h1>
  <p>Your minimal, intuitive deadline management application.</p>
  <p>Development environment initialized successfully!</p>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: var(--spacing-lg);
    text-align: center;
  }

  h1 {
    margin-bottom: var(--spacing-md);
  }

  p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-md);
  }
</style>
