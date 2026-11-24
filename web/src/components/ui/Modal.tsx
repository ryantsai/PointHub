import { CloseButton, Dialog, Flex, Portal } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  opened: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Buttons, right-aligned under the body. */
  footer?: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** `false` keeps the dialog open on outside click / Escape (while a mutation runs, or to protect a one-time secret). */
  dismissible?: boolean;
}

/**
 * Centered dialog. Same `opened` / `onClose` / `title` props as Mantine's `<Modal>`. The content is only
 * mounted while open, so form state inside starts fresh every time.
 */
export function Modal({ opened, onClose, title, children, footer, size = 'md', dismissible = true }: ModalProps) {
  const { t } = useTranslation();
  return (
    <Dialog.Root
      open={opened}
      onOpenChange={(event) => {
        if (!event.open) onClose();
      }}
      size={size}
      placement="center"
      scrollBehavior="inside"
      closeOnInteractOutside={dismissible}
      closeOnEscape={dismissible}
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner px="3">
          <Dialog.Content borderRadius="l3" borderWidth="2px" borderColor="border.emphasized" boxShadow="0 6px 0 0 {colors.border.emphasized}" bg="bg.panel">
            <Dialog.Header pb="2">
              <Dialog.Title fontWeight="extrabold" fontSize="lg" pr="8">
                {title}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>{children}</Dialog.Body>
            {footer && (
              <Dialog.Footer>
                <Flex gap="2" wrap="wrap" justify="flex-end" w="full">
                  {footer}
                </Flex>
              </Dialog.Footer>
            )}
            {dismissible && (
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" aria-label={t('app.close')} />
              </Dialog.CloseTrigger>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
