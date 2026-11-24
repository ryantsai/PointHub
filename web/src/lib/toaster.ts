import { createToaster } from '@chakra-ui/react';

/** The one toast store. Use `notifySuccess` / `notifyError` from lib/notify; <Toaster /> in main.tsx renders it. */
export const toaster = createToaster({ placement: 'top-end', pauseOnPageIdle: true, max: 4, duration: 4500 });
