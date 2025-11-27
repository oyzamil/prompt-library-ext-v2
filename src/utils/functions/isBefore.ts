/**
 * Checks if the current date is before the given D-M-YYYY date string.
 * @param dateStr - Must be in D-M-YYYY format (e.g., "1-1-2025" or "15-12-2026")
 * @returns boolean - true if now is before the date
 * @throws Error if format or date is invalid
 */
export function isBefore(dateStr: `${number}-${number}-${number}`): boolean {
  const regex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const match = dateStr.match(regex);

  if (!match) {
    throw new Error('Invalid date format. Use D-M-YYYY (e.g. 1-1-2025)');
  }

  const [, dayStr, monthStr, yearStr] = match;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  // Basic sanity check for real calendar values
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error('Invalid date: out of range');
  }

  // Create a date using UTC to avoid timezone discrepancies
  const inputDate = new Date(Date.UTC(year, month - 1, day));

  // Check if the created date matches (e.g., no Feb 30)
  if (inputDate.getUTCFullYear() !== year || inputDate.getUTCMonth() + 1 !== month || inputDate.getUTCDate() !== day) {
    throw new Error('Invalid date: not a real calendar date');
  }

  return new Date() < inputDate;
}
