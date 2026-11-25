import { toaster } from './toaster';

// Same API as before the port: callers pass an already-translated message.

export function notifySuccess(message: string) {
  toaster.create({ description: message, type: 'success' });
}

/** Something worked, but not completely (a capped export). Stays a little longer than a success. */
export function notifyWarning(message: string) {
  toaster.create({ description: message, type: 'warning', duration: 9000 });
}

export function notifyError(message: string) {
  toaster.create({ description: message, type: 'error', duration: 7000 });
}
