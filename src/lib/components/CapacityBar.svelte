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
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
  }

  .capacity-bar.over-capacity {
    border-color: var(--danger);
    background: rgba(248, 113, 113, 0.1);
  }

  .capacity-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: var(--font-size-sm);
  }

  .label {
    color: var(--text-secondary);
    font-weight: 600;
  }

  .time {
    color: var(--text-primary);
    font-weight: 600;
  }

  .bar-container {
    width: 100%;
    height: 8px;
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    overflow: hidden;
    margin: 8px 0;
  }

  .bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--success), var(--accent));
    border-radius: var(--radius-sm);
    transition: width var(--transition-normal);
  }

  .capacity-bar.over-capacity .bar-fill {
    background: linear-gradient(90deg, var(--danger), var(--warning));
  }

  .remaining-text {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    text-align: right;
  }

  .remaining-text.warning {
    color: var(--danger);
    font-weight: 600;
  }
</style>
