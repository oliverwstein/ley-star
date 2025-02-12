// src/lib/utils/dates.ts

/**
 * Formats a year number into a display string.
 * Handles BCE dates by adding "BCE" suffix.
 * @param year - The year number (negative for BCE)
 * @returns Formatted year string
 */
export function formatDate(year: number): string {
    if (year < 0) {
        return `${Math.abs(year)} BCE`;
    }
    return year.toString();
}

/**
 * Formats a date range into a human-readable string.
 * @param startYear - Start year (negative for BCE)
 * @param endYear - End year (negative for BCE)
 * @returns Formatted date range string
 */
export function formatDateRange(startYear: number, endYear: number): string {
    return `${formatDate(startYear)} - ${formatDate(endYear)}`;
}

/**
 * Gets the century from a year.
 * @param year - The year (negative for BCE)
 * @returns Century string (e.g., "12th century")
 */
export function getCentury(year: number): string {
    const century = Math.ceil(Math.abs(year) / 100);
    const suffix = getSuffix(century);
    
    if (year < 0) {
        return `${century}${suffix} century BCE`;
    }
    return `${century}${suffix} century`;
}

/**
 * Gets the ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 * @param n - The number
 * @returns The ordinal suffix
 */
function getSuffix(n: number): string {
    const j = n % 10;
    const k = n % 100;
    
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}