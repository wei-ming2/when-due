import { format, isSameYear, isToday, isTomorrow } from 'date-fns';

/**
 * Format a date for display with smart labels (Today, Tomorrow, or date)
 * Format: [DD/MM/YYYY HHMM]
 */
export function formatDeadlineDisplay(dateString: string | undefined | null): string {
  if (!dateString) return 'No due date';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';

    // Check if it's today
    if (isToday(date)) {
      return `Today, ${format(date, 'HH:mm')}`;
    }

    // Check if it's tomorrow
    if (isTomorrow(date)) {
      return `Tomorrow, ${format(date, 'HH:mm')}`;
    }

    if (isSameYear(date, new Date())) {
      return format(date, 'EEE d MMM, HH:mm');
    }

    return format(date, 'd MMM yyyy, HH:mm');
  } catch (e) {
    return 'Invalid date';
  }
}

/**
 * Format date for storage/API - simple datetime format
 */
export function formatDateForStorage(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toISOString();
  } catch (e) {
    return '';
  }
}

export function formatDeadlineInput(dateString: string | undefined | null): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return format(date, "yyyy-MM-dd'T'HH:mm");
  } catch (e) {
    return '';
  }
}

export function deadlineInputToIso(dateString: string): string | null {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch (e) {
    return null;
  }
}
