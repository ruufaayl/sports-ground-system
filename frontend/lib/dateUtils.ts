// ── Date utilities for Pakistan Standard Time (UTC+5) ──────────────────────────
// All dates in the system must be in PKT. Never use toISOString() for dates.

/**
 * Get a date formatted as YYYY-MM-DD in Pakistan timezone.
 * en-CA locale returns YYYY-MM-DD format natively.
 */
export const getPKTDate = (date?: Date): string => {
    const d = date || new Date();
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
};

/**
 * Get the current hour (0-23) in Pakistan timezone.
 */
export const getPKTHour = (): number => {
    return parseInt(
        new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Karachi',
            hour: 'numeric',
            hour12: false,
        })
    );
};

/**
 * Parse a YYYY-MM-DD string into a local Date (no UTC shift).
 * This is the ONLY safe way to parse date strings.
 */
export const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

/**
 * Format a YYYY-MM-DD string to long display: "Friday, 27 February 2026"
 */
export const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString('en-PK', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

/**
 * Format a YYYY-MM-DD to short: "Fri 27 Feb"
 */
export const formatDateShort = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
};

/**
 * Get full day name from YYYY-MM-DD: "Friday"
 */
export const getDayName = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
};

/**
 * Get short day name from YYYY-MM-DD: "Fri"
 */
export const getDayShort = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
};

/**
 * Get month short name from YYYY-MM-DD: "Feb"
 */
export const getMonthShort = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short' });
};

/**
 * Format time "18:00" or "18:00:00" to "6:00 PM"
 */
export const formatTime = (timeStr: string): string => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHour}:${(minutes || 0).toString().padStart(2, '0')} ${ampm}`;
};

/**
 * Generate next N days from today (PKT) as YYYY-MM-DD strings.
 */
export const getNextDays = (count = 14): string[] => {
    const days: string[] = [];
    for (let i = 0; i < count; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        days.push(getPKTDate(d));
    }
    return days;
};

/**
 * Check if a date string is today in PKT.
 */
export const isToday = (dateStr: string): boolean => {
    return dateStr === getPKTDate();
};
