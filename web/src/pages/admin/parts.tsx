// Small building blocks shared by the admin pages.
import { Box, Button, chakra, Flex, Link as ChakraLink, Tag, Text, type HTMLChakraProps } from '@chakra-ui/react';
import { FilterX } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { can } from '../../lib/roles';
import { useSession } from '../../lib/session';

/** A table cell with a strong first line and a quiet second one (name over number, date over id). */
export function TwoLine({ primary, secondary, strong = true }: { primary: ReactNode; secondary?: ReactNode; strong?: boolean }) {
  return (
    <Box minW="0">
      <Box fontWeight={strong ? 'bold' : 'medium'} lineHeight="1.35">
        {primary}
      </Box>
      {secondary && (
        <Text fontSize="xs" color="fg.muted" fontWeight="medium" lineHeight="1.4">
          {secondary}
        </Text>
      )}
    </Box>
  );
}

/** A button that reads as a link: in-table filters ("show this employee's rows"). */
export function LinkButton(props: HTMLChakraProps<'button'>) {
  return (
    <chakra.button
      type="button"
      color="brand.fg"
      fontWeight="bold"
      textAlign="start"
      cursor="pointer"
      borderRadius="l1"
      lineHeight="1.35"
      _hover={{ textDecoration: 'underline' }}
      focusVisibleRing="outside"
      {...props}
    />
  );
}

/** A router link with the look of `LinkButton`: for a cell that opens another page. */
export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <ChakraLink asChild color="brand.fg" fontWeight="bold" lineHeight="1.35" borderRadius="l1" focusVisibleRing="outside">
      <Link to={to}>{children}</Link>
    </ChakraLink>
  );
}

/**
 * An employee's name in a table. It opens the lookup page for people who may see it (system admins and
 * auditors); for everyone else (a gift admin on the claims page) it is plain text.
 */
export function EmployeeLink({ id, children }: { id: number; children: ReactNode }) {
  const me = useSession();
  return can.viewAdmin(me) ? <TextLink to={`/admin/employees/${id}`}>{children}</TextLink> : <>{children}</>;
}

/** A filter that came with the link (one employee, one event), shown as a chip that can be removed. */
export function FilterChip({ label, onClear }: { label: ReactNode; onClear: () => void }) {
  const { t } = useTranslation();
  return (
    <Tag.Root size="lg" colorPalette="brand" variant="subtle" borderRadius="full" maxW="full">
      <Tag.Label fontWeight="bold">{label}</Tag.Label>
      <Tag.EndElement>
        <Tag.CloseTrigger aria-label={t('admin.ledger.clearFilter')} onClick={onClear} />
      </Tag.EndElement>
    </Tag.Root>
  );
}

/** "Clear filters" at the end of a toolbar; pass `active` so it only shows when there is something to clear. */
export function ClearFilters({ active, onClear }: { active: boolean; onClear: () => void }) {
  const { t } = useTranslation();
  if (!active) return null;
  return (
    <Button variant="ghost" colorPalette="gray" onClick={onClear}>
      <FilterX aria-hidden />
      {t('filters.clear')}
    </Button>
  );
}

/** Right-aligned button row at the end of a dialog form. */
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <Flex justify="flex-end" gap="2" wrap="wrap" pt="1">
      {children}
    </Flex>
  );
}

/**
 * Toolbar above a table: search and filters on one wrapping line. `actions` (Export CSV) are pushed to the
 * far end on a wide screen and wrap under the filters on a narrow one.
 */
export function Toolbar({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <Flex gap="3" align="center" wrap="wrap">
      {children}
      {actions && (
        <Flex gap="2" align="center" wrap="wrap" ml={{ md: 'auto' }}>
          {actions}
        </Flex>
      )}
    </Flex>
  );
}

/** A table with its toolbar above and its pager below, closer together than the sections of a page. */
export function TableBlock({ children }: { children: ReactNode }) {
  return (
    <Flex direction="column" gap="3" minW="0">
      {children}
    </Flex>
  );
}

interface FormProps extends Omit<HTMLChakraProps<'form'>, 'onSubmit'> {
  onSubmit: () => void;
  children: ReactNode;
}

/**
 * A column form. The browser's own validation bubbles are off (`noValidate`): every form here checks its
 * fields itself and shows translated messages under them.
 */
export function Form({ onSubmit, children, ...rest }: FormProps) {
  return (
    <chakra.form
      noValidate
      display="flex"
      flexDirection="column"
      gap="4"
      minW="0"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      {...rest}
    >
      {children}
    </chakra.form>
  );
}
