// Material Design inspired color palette for events
export const EVENT_COLORS = [
  { bg: '#E8F5E9', text: '#1B5E20', accent: '#4CAF50' }, // Green
  { bg: '#E3F2FD', text: '#0D47A1', accent: '#2196F3' }, // Blue
  { bg: '#FFF3E0', text: '#E65100', accent: '#FF9800' }, // Orange
  { bg: '#F3E5F5', text: '#4A148C', accent: '#9C27B0' }, // Purple
  { bg: '#E0F7FA', text: '#006064', accent: '#00BCD4' }, // Cyan
  { bg: '#FCE4EC', text: '#880E4F', accent: '#E91E63' }, // Pink
  { bg: '#FFF8E1', text: '#FF6F00', accent: '#FFC107' }, // Amber
  { bg: '#E8EAF6', text: '#1A237E', accent: '#3F51B5' }, // Indigo
  { bg: '#EFEBE9', text: '#3E2723', accent: '#795548' }, // Brown
  { bg: '#E0F2F1', text: '#004D40', accent: '#009688' }, // Teal
  { bg: '#FBE9E7', text: '#BF360C', accent: '#FF5722' }, // Deep Orange
  { bg: '#F1F8E9', text: '#33691E', accent: '#8BC34A' }, // Light Green
];

export interface EventColor {
  bg: string;
  text: string;
  accent: string;
}

// Simple hash function for string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Extract base title from event title (e.g., "Course Name (Lecture)" -> "Course Name")
export function getBaseTitle(title: string): string {
  const match = title.match(/^(.*?)\s*\([^)]+\)$/);
  return match && match[1] ? match[1].trim() : title;
}

// Get color for a given title
export function getEventColor(title: string): EventColor {
  const baseTitle = getBaseTitle(title);
  const index = hashString(baseTitle) % EVENT_COLORS.length;
  return EVENT_COLORS[index]!;
}

// Cache for color assignments to ensure consistency
const colorCache = new Map<string, EventColor>();

export function getEventColorCached(title: string): EventColor {
  const baseTitle = getBaseTitle(title);
  
  if (!colorCache.has(baseTitle)) {
    colorCache.set(baseTitle, getEventColor(title));
  }
  
  return colorCache.get(baseTitle)!;
}

// Get all unique course colors from a list of events
export function getCourseColors(titles: string[]): Map<string, EventColor> {
  const colors = new Map<string, EventColor>();
  
  for (const title of titles) {
    const baseTitle = getBaseTitle(title);
    if (!colors.has(baseTitle)) {
      colors.set(baseTitle, getEventColorCached(title));
    }
  }
  
  return colors;
}
