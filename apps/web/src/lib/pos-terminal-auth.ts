const POS_SESSION_KEY = 'smartnexus_pos_terminal_session';

/** POS terminalinde PIN ile oturum açıldı mı? (panel oturumu yetmez) */
export function isPosTerminalAuthed(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(POS_SESSION_KEY) === '1';
}

export function setPosTerminalAuthed(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(POS_SESSION_KEY, '1');
}

export function clearPosTerminalAuth(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(POS_SESSION_KEY);
}
