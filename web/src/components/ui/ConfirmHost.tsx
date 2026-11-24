import { Button } from '@chakra-ui/react';
import { closeConfirm, useConfirmRequest } from '../../lib/confirm';
import { Modal } from './Modal';

/** Renders the dialog requested through `openConfirm()` (lib/confirm). Mounted once in main.tsx. */
export function ConfirmHost() {
  const request = useConfirmRequest();
  const cancel = () => {
    request?.onCancel?.();
    closeConfirm();
  };
  return (
    <Modal
      opened={request !== null}
      onClose={cancel}
      title={request?.title}
      size="sm"
      footer={
        request && (
          <>
            <Button variant="outline" onClick={cancel}>
              {request.labels.cancel}
            </Button>
            <Button
              colorPalette={request.danger ? 'red' : 'brand'}
              onClick={() => {
                request.onConfirm();
                closeConfirm();
              }}
            >
              {request.labels.confirm}
            </Button>
          </>
        )
      }
    >
      {request?.children}
    </Modal>
  );
}
