import { Box, FileUpload, Spinner, Text } from '@chakra-ui/react';
import { Upload } from 'lucide-react';
import type { ReactNode } from 'react';

interface FileDropZoneProps {
  /** Called with the files that passed the `accept` / `maxSize` checks. */
  onDrop: (files: File[]) => void;
  /** Called with the files that were refused (wrong type, too large, too many). */
  onReject?: (files: File[]) => void;
  /** MIME types or extensions, e.g. `['text/csv', '.csv']` or `['image/*']`. */
  accept?: string[];
  /** Bytes per file. */
  maxSize?: number;
  /** Maximum number of files per drop (default 1). */
  maxFiles?: number;
  loading?: boolean;
  disabled?: boolean;
  title: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
}

/**
 * Click-or-drop file picker. Replaces `Dropzone` from @mantine/dropzone. It never keeps a file list: every
 * accepted drop is handed to `onDrop` and the zone is ready for the next one.
 */
export function FileDropZone({ onDrop, onReject, accept, maxSize, maxFiles = 1, loading, disabled, title, hint, icon }: FileDropZoneProps) {
  return (
    <FileUpload.Root
      alignItems="stretch"
      accept={accept}
      maxFileSize={maxSize}
      maxFiles={maxFiles}
      disabled={disabled || loading}
      // Empty controlled list: the zone is a trigger, not a queue.
      acceptedFiles={[]}
      onFileAccept={(details) => {
        if (details.files.length > 0) onDrop(details.files);
      }}
      onFileReject={(details) => {
        if (details.files.length > 0) onReject?.(details.files.map((rejection) => rejection.file));
      }}
    >
      <FileUpload.HiddenInput />
      <FileUpload.Dropzone
        minH="36"
        borderWidth="2px"
        borderStyle="dashed"
        borderColor="border.emphasized"
        borderRadius="l3"
        bg="bg.panel"
        cursor="pointer"
        transition="background-color 160ms, border-color 160ms, transform 160ms"
        _hover={{ borderColor: 'brand.solid', bg: 'brand.subtle' }}
        _dragging={{ borderColor: 'brand.solid', bg: 'brand.subtle', transform: 'scale(1.01)' }}
      >
        <Box color="brand.fg">{loading ? <Spinner size="lg" /> : (icon ?? <Upload size={32} strokeWidth={2.2} aria-hidden />)}</Box>
        <FileUpload.DropzoneContent>
          <Text fontWeight="bold">{title}</Text>
          {hint && (
            <Text color="fg.muted" fontSize="sm">
              {hint}
            </Text>
          )}
        </FileUpload.DropzoneContent>
      </FileUpload.Dropzone>
    </FileUpload.Root>
  );
}
