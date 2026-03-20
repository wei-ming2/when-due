import {
  parse,
  isValid,
  add,
  startOfDay,
  format,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
} from 'date-fns';

/**
 * Parse a task input and extract task title, deadline, priority, and time estimate.
 * Supports flexible natural language formats:
 * - "Buy milk [18/03/26 1730]" - date in brackets
 * - "Buy milk @tomorrow 3pm" - @-based deadline (legacy)
 * - "Buy milk !high" - priority flag: !high, !medium, !low
 * - "Buy milk ~45m" - time estimate: ~45m, ~2h, ~2h30m
 * - Combined: "Finish physics homework ~45m !high @tomorrow"
 */
export function parseTaskInput(input: string): { 
  title: string
  deadline: string | null
  priority: 'low' | 'medium' | 'high'
  prioritySpecified: boolean
  timeEstimateMinutes: number | null
  tags: string[]
} {
  let title = input;
  let deadline: string | null = null;
  let priority: 'low' | 'medium' | 'high' = 'medium';
  let prioritySpecified = false;
  let timeEstimateMinutes: number | null = null;
  const tags: string[] = [];

  // Extract time estimate: ~45m, ~2h, ~2h30m, ~1.5h, ~11
  const timeMatch = title.match(/~(\d+(?:\.\d+)?h(?:\d+m)?|\d+m|\d+)/i);
  if (timeMatch && timeMatch[1]) {
    const timeStr = timeMatch[1].toLowerCase();
    let minutes = 0;

    if (/^\d+$/.test(timeStr)) {
      minutes = parseInt(timeStr, 10);
    } else {
      // Match hours: "2h" or "2.5h"
      const hoursMatch = timeStr.match(/(\d+(?:\.\d+)?)h/);
      if (hoursMatch) {
        minutes += Math.round(parseFloat(hoursMatch[1]) * 60);
      }

      // Match minutes: "30m"
      const minutesMatch = timeStr.match(/(\d+)m/);
      if (minutesMatch) {
        minutes += parseInt(minutesMatch[1], 10);
      }
    }

    if (minutes > 0) {
      timeEstimateMinutes = minutes;
      title = title.replace(timeMatch[0], '').trim();
    }
  }

  // Extract date from brackets: [DD/MM/YY HHMM] or [DD/MM/YYYY HHMM]
  const dateMatch = title.match(/\[(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{4})\]/);
  if (dateMatch) {
    const [fullMatch, day, month, year, time] = dateMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const dateStr = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const hours = time.slice(0, 2);
    const minutes = time.slice(2, 4);
    
    try {
      const parsedDate = new Date(`${dateStr}T${hours}:${minutes}:00`);
      if (!isNaN(parsedDate.getTime())) {
        deadline = parsedDate.toISOString();
        title = title.replace(fullMatch, '').trim();
      }
    } catch (e) {
      console.error('Failed to parse date:', e);
    }
  }

  // Extract priority: !high, !medium, !low
  const priorityMatch = title.match(/!(\w+)/);
  if (priorityMatch) {
    const p = priorityMatch[1].toLowerCase();
    if (p === 'low' || p === 'medium' || p === 'high') {
      priority = p;
      prioritySpecified = true;
      title = title.replace(priorityMatch[0], '').trim();
    }
  }

  // Legacy @ format support
  if (!deadline && title.includes('@')) {
    const extracted = extractAtDeadline(title);
    if (extracted.deadline) {
      deadline = extracted.deadline;
      title = extracted.title;
    }
  }

  return { 
    title: title.trim(), 
    deadline, 
    priority,
    prioritySpecified,
    timeEstimateMinutes,
    tags
  };
}

/**
 * Parse a deadline string and return date and time
 * Supports formats like:
 * - "tomorrow 3pm"
 * - "today at 2:30pm"
 * - "monday at 9am"
 * - "3/20 at 2pm"
 * - "2024-03-20 14:30"
 * - "next week at 10am"
 * - "in 2 days at 3pm"
 */
export function parseDeadline(input: string): { title: string; deadline: string | null } {
  if (!input.includes('@')) {
    return { title: input, deadline: null };
  }

  return extractAtDeadline(input);
}

/**
 * Parse a date/time string to a Date object
 */
function parseDateTimeString(input: string): Date | null {
  const normalizedInput = input.toLowerCase().trim();

  // Try parsing with various patterns
  const patterns = [
    parseRelativeDate, // tomorrow, today, next week, etc.
    parseDayOfWeek, // monday, tuesday, etc.
    parseDayOfMonth, // 19 2pm, 19th at 14:00
    parseDayMonthSlash, // 1/5 2300 => 1 May 23:00
    parseStandardDateTime, // 3/20 at 2pm, 2024-03-20 14:30, etc.
    parseStandardFormats, // 2024-03-20, 3/20, etc.
    parseTimeAndDate, // 3pm, 2:30pm, etc.
  ];

  for (const parser of patterns) {
    const result = parser(normalizedInput);
    if (result) {
      return result;
    }
  }

  return null;
}

function parseRelativeDate(input: string): Date | null {
  const now = new Date();
  const today = startOfDay(now);

  if (input.includes('tomorrow')) {
    const match = input.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2] || '0');
      const isPm = match[3] === 'pm' || (hours < 12 && !match[3]);

      const tomorrow = add(today, { days: 1 });
      tomorrow.setHours(isPm && hours !== 12 ? hours + 12 : hours === 12 && !isPm ? 0 : hours, minutes, 0, 0);
      return tomorrow;
    }
    return add(today, { days: 1 });
  }

  if (input.includes('today')) {
    const match = input.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2] || '0');
      const isPm = match[3] === 'pm' || (hours < 12 && !match[3]);

      today.setHours(isPm && hours !== 12 ? hours + 12 : hours === 12 && !isPm ? 0 : hours, minutes, 0, 0);
      return today;
    }
    return today;
  }

  if (input.includes('in ')) {
    const match = input.match(/in\s+(\d+)\s+(days?|hours?|weeks?)/);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2];
      let addObj: any = {};

      if (unit.includes('day')) addObj.days = amount;
      else if (unit.includes('hour')) addObj.hours = amount;
      else if (unit.includes('week')) addObj.weeks = amount;

      const result = add(today, addObj);
      const timeMatch = input.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const isPm = timeMatch[3] === 'pm' || (hours < 12 && !timeMatch[3]);
        result.setHours(isPm && hours !== 12 ? hours + 12 : hours === 12 && !isPm ? 0 : hours, minutes, 0, 0);
      }
      return result;
    }
  }

  if (input.includes('next week')) {
    const result = add(today, { weeks: 1 });
    const timeMatch = input.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2] || '0');
      const isPm = timeMatch[3] === 'pm' || (hours < 12 && !timeMatch[3]);
      result.setHours(
        isPm && hours !== 12 ? hours + 12 : hours === 12 && !isPm ? 0 : hours,
        minutes,
        0,
        0
      );
    } else {
      result.setHours(23, 59, 0, 0);
    }
    return result;
  }

  if (input === 'eom' || input === 'end of month' || input === 'month end') {
    const result = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 0, 0);
    return result;
  }

  return null;
}

function parseDayOfWeek(input: string): Date | null {
  const days: Record<string, (baseDate: Date) => Date> = {
    monday: nextMonday,
    tuesday: nextTuesday,
    wednesday: nextWednesday,
    thursday: nextThursday,
    friday: nextFriday,
    saturday: nextSaturday,
    sunday: nextSunday,
  };

  for (const [day, getNextDay] of Object.entries(days)) {
    if (input.includes(day)) {
      const result = getNextDay(new Date());
      const match = input.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
      if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2] || '0');
        const isPm = match[3] === 'pm' || (hours < 12 && !match[3]);
        result.setHours(isPm && hours !== 12 ? hours + 12 : hours === 12 && !isPm ? 0 : hours, minutes, 0, 0);
      }
      return result;
    }
  }

  return null;
}

function parseTimeAndDate(input: string): Date | null {
  if (input.includes('/') || input.includes('-')) return null;

  // Match patterns like "3pm", "2:30am", "14:30", etc.
  const timeMatch = input.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/);
  if (!timeMatch) return null;

  const hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2] || '0');
  const isPm = timeMatch[3] === 'pm';

  const now = new Date();
  const result = new Date(now);

  if (!isPm && hours >= 12) {
    // If no am/pm specified and hours >= 12, assume pm
    result.setHours(hours, minutes, 0, 0);
  } else if (isPm && hours !== 12) {
    result.setHours(hours + 12, minutes, 0, 0);
  } else if (!isPm && hours === 12) {
    result.setHours(0, minutes, 0, 0);
  } else {
    result.setHours(hours, minutes, 0, 0);
  }

  // If time is in the past, assume it's tomorrow
  if (result < now) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

function parseDayOfMonth(input: string): Date | null {
  const match = input.match(
    /^(\d{1,2})(?:st|nd|rd|th)?(?:\s+(?:at\s+)?)?(?:(\d{4})|(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?)?$/i
  );
  if (!match) return null;

  const day = parseInt(match[1], 10);
  if (day < 1 || day > 31) return null;

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();

  if (day < now.getDate()) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  const candidate = buildDateForDay(year, month, day);
  if (!candidate) return null;

  if (match[2] || match[3]) {
    const hours = match[2] ? parseInt(match[2].slice(0, 2), 10) : parseInt(match[3], 10);
    const minutes = match[2] ? parseInt(match[2].slice(2, 4), 10) : parseInt(match[4] || '0', 10);
    const meridiem = match[5]?.toLowerCase();
    if (hours > 23 || minutes > 59 || hours < 0 || minutes < 0) return null;
    if (meridiem && (hours > 12 || hours === 0)) return null;
    candidate.setHours(to24Hour(hours, meridiem), minutes, 0, 0);
  } else {
    candidate.setHours(23, 59, 0, 0);
  }

  return candidate;
}

function parseStandardDateTime(input: string): Date | null {
  const patterns = [
    "M/d 'at' h:mma",
    "M/d 'at' ha",
    'M/d h:mma',
    'M/d ha',
    'M/d HH:mm',
    "MM/dd 'at' h:mma",
    "MM/dd 'at' ha",
    'MM/dd h:mma',
    'MM/dd ha',
    'MM/dd HH:mm',
    "yyyy-MM-dd 'at' h:mma",
    "yyyy-MM-dd 'at' ha",
    'yyyy-MM-dd HH:mm',
    "yyyy-MM-dd'T'HH:mm",
  ];

  for (const pattern of patterns) {
    const result = parse(input, pattern, new Date());
    if (isValid(result)) return result;
  }

  return null;
}

function parseDayMonthSlash(input: string): Date | null {
  const match = input.match(
    /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?:\s+(?:at\s+)?)?(?:(\d{4})|(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?)?$/i
  );
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const yearToken = match[3];
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  const now = new Date();
  let year = yearToken
    ? yearToken.length === 2
      ? 2000 + parseInt(yearToken, 10)
      : parseInt(yearToken, 10)
    : now.getFullYear();

  let candidate = new Date(year, month - 1, day);
  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getDate() !== day ||
    candidate.getMonth() !== month - 1
  ) {
    return null;
  }

  if (match[4] || match[5]) {
    const hours = match[4] ? parseInt(match[4].slice(0, 2), 10) : parseInt(match[5], 10);
    const minutes = match[4] ? parseInt(match[4].slice(2, 4), 10) : parseInt(match[6] || '0', 10);
    const meridiem = match[7]?.toLowerCase();
    if (hours > 23 || minutes > 59 || hours < 0 || minutes < 0) return null;
    if (meridiem && (hours > 12 || hours === 0)) return null;
    candidate.setHours(to24Hour(hours, meridiem), minutes, 0, 0);
  } else {
    candidate.setHours(23, 59, 0, 0);
  }

  if (!yearToken && candidate.getTime() < now.getTime()) {
    year += 1;
    candidate = new Date(year, month - 1, day, candidate.getHours(), candidate.getMinutes(), 0, 0);
    if (
      Number.isNaN(candidate.getTime()) ||
      candidate.getDate() !== day ||
      candidate.getMonth() !== month - 1
    ) {
      return null;
    }
  }

  return candidate;
}

function parseStandardFormats(input: string): Date | null {
  // Try ISO format: 2024-03-20T14:30
  let result = parse(input, 'yyyy-MM-dd HH:mm', new Date());
  if (isValid(result)) return result;

  result = parse(input, 'yyyy-MM-dd', new Date());
  if (isValid(result)) return result;

  // Try MM/dd format: 3/20 or 03/20
  result = parse(input, 'M/d', new Date());
  if (isValid(result)) return result;

  result = parse(input, 'MM/dd', new Date());
  if (isValid(result)) return result;

  // Try MM/dd/yyyy format
  result = parse(input, 'M/d/yyyy', new Date());
  if (isValid(result)) return result;

  return null;
}

function buildDateForDay(year: number, month: number, day: number): Date | null {
  for (let monthOffset = 0; monthOffset < 12; monthOffset += 1) {
    const candidate = new Date(year, month + monthOffset, day);
    if (candidate.getDate() === day) {
      return candidate;
    }
  }

  return null;
}

function to24Hour(hours: number, meridiem?: string): number {
  if (!meridiem) return hours;
  if (meridiem === 'pm' && hours !== 12) return hours + 12;
  if (meridiem === 'am' && hours === 12) return 0;
  return hours;
}

function extractAtDeadline(input: string): { title: string; deadline: string | null } {
  const matches = Array.from(input.matchAll(/(^|\s)@(?=\S)/g));

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];
    const markerIndex = (match.index ?? 0) + match[1].length;
    const deadlinePart = input.slice(markerIndex + 1).trim();

    if (!deadlinePart) continue;

    try {
      const parsedDeadline = parseDateTimeString(deadlinePart);
      if (parsedDeadline) {
        return {
          title: input.slice(0, markerIndex).trim(),
          deadline: parsedDeadline.toISOString(),
        };
      }
    } catch (e) {
      console.error('Failed to parse deadline:', e);
    }
  }

  return { title: input, deadline: null };
}
