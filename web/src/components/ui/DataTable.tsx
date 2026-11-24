import { Box, Table } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { EmptyState, ErrorBlock, LoadingBlock } from '../states';
import { headerCellProps, tableCss } from './tableStyles';

interface TableFrameProps {
  children: ReactNode;
  /** The table never gets narrower than this; below it the frame scrolls sideways. */
  minWidth?: number;
}

/**
 * Sticker frame with horizontal scrolling for a hand-written `<Table.Root>`. Replaces Mantine's
 * `Table.ScrollContainer`. The page itself never scrolls sideways; only this box does.
 */
export function TableFrame({ children, minWidth = 560 }: TableFrameProps) {
  return (
    <Table.ScrollArea borderWidth="2px" borderColor="border" borderRadius="l2" bg="bg.panel" maxW="full" boxShadow="0 4px 0 0 {colors.border}">
      <Box minW={`${minWidth}px`}>{children}</Box>
    </Table.ScrollArea>
  );
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'start' | 'end' | 'center';
  /** Keep the column as narrow as its content (action buttons). */
  shrink?: boolean;
  /** Tabular numerals for amounts and counts. */
  numeric?: boolean;
}

interface DataTableProps<T> {
  columns: readonly Column<T>[];
  rows: readonly T[] | undefined;
  rowKey: (row: T) => string | number;
  minWidth?: number;
  /** First load: shows the loader instead of the table. */
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Shown when `rows` is empty. */
  emptyMessage: string;
  emptyIcon?: ReactNode;
  /** Dim the rows while a new page is being fetched (`isPlaceholderData`). */
  stale?: boolean;
  size?: 'sm' | 'md';
}

/** Column-driven table with the loading / error / empty states built in. */
export function DataTable<T>({ columns, rows, rowKey, minWidth, loading, error, onRetry, emptyMessage, emptyIcon, stale, size = 'sm' }: DataTableProps<T>) {
  if (loading) return <LoadingBlock />;
  if (error && !rows) return <ErrorBlock error={error} onRetry={onRetry} />;
  if (!rows || rows.length === 0) return <EmptyState message={emptyMessage} icon={emptyIcon} />;

  return (
    <TableFrame minWidth={minWidth}>
      <Table.Root size={size} variant="line" css={tableCss}>
        <Table.Header>
          <Table.Row bg="bg.subtle">
            {columns.map((column) => (
              <Table.ColumnHeader key={column.key} textAlign={column.align} w={column.shrink ? '1%' : undefined} {...headerCellProps}>
                {column.header}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body opacity={stale ? 0.55 : 1} transition="opacity 160ms">
          {rows.map((row) => (
            <Table.Row key={rowKey(row)} bg="bg.panel" _hover={{ bg: 'bg.subtle' }}>
              {columns.map((column) => (
                <Table.Cell key={column.key} textAlign={column.align} fontVariantNumeric={column.numeric ? 'tabular-nums' : undefined} whiteSpace={column.shrink ? 'nowrap' : undefined}>
                  {column.cell(row)}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </TableFrame>
  );
}
