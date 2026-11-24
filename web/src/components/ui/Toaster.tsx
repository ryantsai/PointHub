import { Portal, Spinner, Stack, Toast, Toaster as ChakraToaster } from '@chakra-ui/react';
import { toaster } from '../../lib/toaster';

/** Renders the toasts created through lib/notify. Mounted once in main.tsx. */
export function Toaster() {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: '4' }}>
        {(toast) => (
          <Toast.Root width={{ md: 'sm' }} borderRadius="l2" boxShadow="0 4px 0 0 rgba(0, 0, 0, 0.25)">
            {toast.type === 'loading' ? <Spinner size="sm" color="colorPalette.solid" /> : <Toast.Indicator />}
            <Stack gap="1" flex="1" maxWidth="100%">
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && <Toast.Description fontWeight="semibold">{toast.description}</Toast.Description>}
            </Stack>
            <Toast.CloseTrigger />
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  );
}
