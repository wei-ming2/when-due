<script lang="ts">
  import { totalTimeEstimate } from '../stores/tasks';
  import { calculateRemainingTime } from '../utils/formatting';

  export let availableHours = 8;

  $: totalMinutes = $totalTimeEstimate;
  $: capacity = (totalMinutes / (availableHours * 60)) * 100;
  $: isOverCapacity = capacity > 100;
  $: remaining = calculateRemainingTime(totalMinutes, availableHours);
</script>

<div class="capacity-bar" class:over-capacity={isOverCapacity}>
  <div class="capacity-info">
    <span class="label">Today's Focus</span>
    <span class="time">{totalMinutes > 0 ? `${totalMinutes}m` : '0m'} / {availableHours * 60}m</span>
  </div>

  <div class="bar-container">
    <div class="bar-fill" style="width: {Math.min(capacity, 100)}%" />
  </div>

  <div class="remaining-text" class:warning={isOverCapacity}>
    {remaining}
  </div>
</div>

<style>
  .capacity-bar {
    margin: 16px 0;
    padding: 12px;
    border-radius: 8px;
    background: var(--color-card-bg);
    border: 1px solid var(--color-border);
  }

  .capacity-bar.over-capacity {
    border-color: rgb(239, 68, 68);
    background: rgba(239, 68, 68, 0.05);
  }

  .capacity-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 0.875rem;
  }

  .label {
    color: var(--color-text-secondary);
    font-weight: 600;
  }

  .time {
    color: var(--color-text);
    font-weight: 600;
  }

  .bar-container {
    width: 100%;
    height: 8px;
    border-radius: 4px;
    background: var(--color-border);
    overflow: hidden;
    margin: 8px 0;
  }

  .bar-fill {
    height: 100%;
    background: linear-gradient(90deg, rgb(16, 185, 129), rgb(59, 130, 246));
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .capacity-bar.over-capacity .bar-fill {
    background: linear-gradient(90deg, rgb(239, 68, 68), rgb(249, 115, 22));
  }

  .remaining-text {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    text-align: right;
  }

  .remaining-text.warning {
    color: rgb(239, 68, 68);
    font-weight: 600;
  }
</style>
