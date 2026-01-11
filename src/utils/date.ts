// src/utils/date.ts

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getToday(): string {
  const now = new Date();
  return formatDate(now);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3) return new Date();
  const y = parts[0] as number;
  const m = parts[1] as number;
  const d = parts[2] as number;
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // adjust when day is sunday
  return new Date(d.setDate(diff));
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  dayNum: number;
}

export function generateMonthGrid(year: number, month: number): CalendarDay[] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfMonth(year, month); // 0 = Sunday

  const grid: CalendarDay[] = [];

  // Previous month filler
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const dateObj = new Date(year, month - 1, d);
    grid.push({
      date: formatDate(dateObj),
      isCurrentMonth: false,
      dayNum: d,
    });
  }

  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(year, month, i);
    grid.push({
      date: formatDate(dateObj),
      isCurrentMonth: true,
      dayNum: i,
    });
  }

  // Next month filler
  const totalCells = 42; // 6 rows * 7 cols
  const remaining = totalCells - grid.length;
  for (let i = 1; i <= remaining; i++) {
    const dateObj = new Date(year, month + 1, i);
    grid.push({
      date: formatDate(dateObj),
      isCurrentMonth: false,
      dayNum: i,
    });
  }

  return grid;
}

export function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':').map(Number);
  if (parts.length < 2) return timeStr;
  const h = parts[0] as number;
  const m = parts[1] as number;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}
