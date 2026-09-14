const KEY = 'sinagra_current_match_id';

export function getCurrentMatchId(): string | null {
  // Pulisci il vecchio formato JSON blob se presente
  localStorage.removeItem('sinagra_match_graphics_v1');
  return localStorage.getItem(KEY);
}

export function setCurrentMatchId(id: string): void {
  localStorage.setItem(KEY, id);
}

export function clearCurrentMatchId(): void {
  localStorage.removeItem(KEY);
}
