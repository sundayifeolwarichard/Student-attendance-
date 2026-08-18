/**
 * West Africa Time (WAT / UTC+1) utilities for The Polytechnic, Ibadan
 */

export function getWATDate(): Date {
  const now = new Date();
  // Get UTC time ms then add +1 hour (WAT is UTC+1)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const watOffset = 1 * 60 * 60 * 1000;
  return new Date(utc + watOffset);
}

export function formatWATTime(dateInput?: Date | string | number): string {
  const date = dateInput ? new Date(dateInput) : getWATDate();
  return date.toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatWATDate(dateInput?: Date | string | number): string {
  const date = dateInput ? new Date(dateInput) : getWATDate();
  return date.toLocaleDateString('en-GB', {
    timeZone: 'Africa/Lagos',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatWATShortDate(dateInput?: Date | string | number): string {
  const date = dateInput ? new Date(dateInput) : getWATDate();
  return date.toLocaleDateString('en-GB', {
    timeZone: 'Africa/Lagos',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getWATDateString(dateInput?: Date | string | number): string {
  const date = dateInput ? new Date(dateInput) : getWATDate();
  // Format as YYYY-MM-DD in WAT
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export function getGreeting(name: string): string {
  const wat = getWATDate();
  const hour = wat.getHours();
  let greeting = 'Good day';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  else greeting = 'Good evening';
  
  const firstName = name.split(' ')[0] || name;
  return `${greeting}, ${firstName}`;
}
