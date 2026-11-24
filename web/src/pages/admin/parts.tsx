// Small building blocks shared by the admin pages.
import { Box, chakra, Flex, Text, type HTMLChakraProps } from '@chakra-ui/react';
import type { ReactNode } from 'react';

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

/** Right-aligned button row at the end of a dialog form. */
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <Flex justify="flex-end" gap="2" wrap="wrap" pt="1">
      {children}
    </Flex>
  );
}

/** Toolbar above a table: search and filters on one wrapping line. */
export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <Flex gap="3" align="center" wrap="wrap">
      {children}
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
