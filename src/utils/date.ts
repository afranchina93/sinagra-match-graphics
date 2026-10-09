/**
 * Parsa una stringa data in ora locale (non UTC).
 * "2024-10-15" → new Date(2024, 9, 15, 0, 0, 0) — evita lo shift UTC+2
 * Supporta sia "YYYY-MM-DD" che "YYYY-MM-DDTHH:mm:ss".
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  // Se contiene già un'ora locale (no Z, no +offset) lascia fare a JS
  if (dateStr.includes('T')) return new Date(dateStr);
  // Data senza orario: forza orario locale mezzanotte
  return new Date(dateStr + 'T00:00:00');
}
