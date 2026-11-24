import { toaster } from './toaster';

// Same API as before the port: callers pass an already-translated message.

export function notifySuccess(message: string) {
  toaster.create({ description: message, type: 'success' });
}

export function notifyError(message: string) {
  toaster.create({ description: message, type: 'error', duration: 7000 });
}
