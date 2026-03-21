<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { toasts } from '../stores/toasts';
</script>

<div class="toast-stack" aria-live="polite" aria-atomic="true">
  {#each $toasts as toast (toast.id)}
    <div
      class={`toast ${toast.tone}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      in:fly={{ y: -10, duration: 180 }}
      out:fade={{ duration: 120 }}
    >
      <div class="toast-copy">
        <p class="toast-title">{toast.title}</p>
        {#if toast.message}
          <p class="toast-message">{toast.message}</p>
        {/if}
      </div>
      <button
        class="toast-close"
        type="button"
        on:click={() => toasts.remove(toast.id)}
        aria-label="Dismiss message"
      >
        ×
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-stack {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 160;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
    width: min(360px, calc(100vw - 24px));
  }

  .toast {
    pointer-events: auto;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 16px;
    border: 1px solid var(--border-color);
    background: color-mix(in srgb, var(--bg-secondary) 92%, white);
    box-shadow: var(--shadow-md);
    backdrop-filter: blur(18px);
  }

  .toast.error {
    border-color: color-mix(in srgb, var(--danger) 26%, var(--border-color));
  }

  .toast.success {
    border-color: color-mix(in srgb, var(--success) 26%, var(--border-color));
  }

  .toast.info {
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border-color));
  }

  .toast-copy {
    min-width: 0;
  }

  .toast-title,
  .toast-message {
    margin: 0;
  }

  .toast-title {
    font-size: 0.92rem;
    font-weight: 650;
    color: var(--text-primary);
  }

  .toast-message {
    margin-top: 2px;
    font-size: 0.82rem;
    color: var(--text-secondary);
    line-height: 1.35;
  }

  .toast-close {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    padding: 0;
    border-radius: 999px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-tertiary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
  }

  .toast-close:hover {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--bg-tertiary) 82%, transparent);
  }

  @media (max-width: 720px) {
    .toast-stack {
      top: 14px;
      right: 12px;
      left: 12px;
      width: auto;
    }
  }
</style>
