// Integrated Windows sign-in is tried automatically at most once per browser tab (see LoginPage).

const FLAG = 'pointhub.windowsSignInTried';

/** Has this tab already made its one automatic attempt? Unreadable storage counts as "yes": never risk a loop. */
export function windowsSignInAlreadyTried(): boolean {
  try {
    return window.sessionStorage.getItem(FLAG) !== null;
  } catch {
    return true;
  }
}

/**
 * Takes this tab's one automatic attempt. `false` when it was already taken (or the flag cannot be stored),
 * in which case the caller must not navigate.
 */
export function claimWindowsSignInAttempt(): boolean {
  try {
    if (window.sessionStorage.getItem(FLAG) !== null) return false;
    window.sessionStorage.setItem(FLAG, '1');
    return true;
  } catch {
    return false;
  }
}
