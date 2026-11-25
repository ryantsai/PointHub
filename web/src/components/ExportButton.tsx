import { Button, type ButtonProps } from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { downloadFile, type QueryParams } from '../api/client';
import { useErrorMessage, useFormat, useLocale } from '../i18n/hooks';
import { notifyError, notifySuccess, notifyWarning } from '../lib/notify';

/** The server never puts more rows than this in one export (docs/api.md, "CSV export"). */
const EXPORT_ROW_CAP = 50_000;

interface ExportButtonProps extends Omit<ButtonProps, 'onClick' | 'loading' | 'children'> {
  /** The list's `/export` twin, e.g. `/api/admin/transactions/export`. */
  path: string;
  /** Exactly the filters of the list on screen, without paging. */
  filters?: QueryParams;
}

/**
 * "Export CSV" for any exportable list: downloads the `/export` twin with the list's filters and the current
 * UI language (for the column headings), saves it under the name the server gives, and says so in a toast.
 * A capped export (`X-Export-Truncated`) and any refusal (403, a bad date) are toasts too.
 */
export function ExportButton({ path, filters, ...rest }: ExportButtonProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  // A mutation, so a 401 clears the session like any other call (see api/queryClient).
  const download = useMutation({ mutationFn: () => downloadFile(path, { ...filters, locale }) });

  return (
    <Button
      variant="outline"
      loading={download.isPending}
      loadingText={t('export.working')}
      onClick={() =>
        download.mutate(undefined, {
          onSuccess: (file) => {
            if (file.truncated) notifyWarning(t('export.truncated', { max: format.number(EXPORT_ROW_CAP), file: file.filename }));
            else notifySuccess(t('export.done', { file: file.filename }));
          },
          onError: (error) => notifyError(t('export.failed', { reason: errorMessage(error) })),
        })
      }
      {...rest}
    >
      <Download aria-hidden />
      {t('export.csv')}
    </Button>
  );
}
