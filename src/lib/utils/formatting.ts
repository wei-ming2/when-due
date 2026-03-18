// Formatting utilities for UI display

export function formatDueDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  } catch {
    return dateStr;
  }
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return labels[priority] || priority;
}

export function getPriorityColor(priority: string): string {
  return `priority-${priority}`;
}

export function formatTimeEstimate(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = minutes / 60;
  if (hours < 24) {
    return hours === Math.floor(hours) ? `${Math.floor(hours)}h` : `${hours.toFixed(1)}h`;
  }
  const days = hours / 24;
  return days === Math.floor(days) ? `${Math.floor(days)}d` : `${days.toFixed(1)}d`;
}

export function calculateRemainingTime(totalMinutes: number, availableHours: number = 8): string {
  const availableMinutes = availableHours * 60;
  const remaining = availableMinutes - totalMinutes;

  if (remaining <= 0) {
    return 'Over capacity';
  }

  if (remaining < 60) {
    return `${remaining}m left`;
  }

  const hours = remaining / 60;
  return hours < 24 ? `${hours.toFixed(1)}h left` : `${(hours / 24).toFixed(1)}d left`;
}
