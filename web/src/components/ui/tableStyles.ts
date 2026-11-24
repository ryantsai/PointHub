/** Header cell style shared by <DataTable> and hand-written tables: spread onto `<Table.ColumnHeader>`. */
export const headerCellProps = {
  fontWeight: 'extrabold',
  fontSize: 'xs',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'fg.muted',
  py: '2.5',
  whiteSpace: 'nowrap',
} as const;

/** `css` for `<Table.Root>` inside a <TableFrame>: themed row borders, no double border at the bottom. */
export const tableCss = {
  '& td, & th': { borderColor: 'border' },
  '& tbody tr:last-of-type td': { borderBottomWidth: 0 },
} as const;
