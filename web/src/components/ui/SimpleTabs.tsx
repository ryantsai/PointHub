import { Box, Tabs } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export interface TabItem<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  /** Small counter or dot after the label. */
  badge?: ReactNode;
  content: ReactNode;
}

interface SimpleTabsProps<T extends string> {
  tabs: readonly TabItem<T>[];
  /** Uncontrolled start tab (defaults to the first). */
  defaultValue?: T;
  /** Controlled mode: pass both. */
  value?: T;
  onChange?: (value: T) => void;
}

/**
 * Pill tabs on a tray. Only the selected panel is mounted (like Mantine's `keepMounted={false}`), so each tab
 * fetches its data when it is opened. The tray scrolls sideways if the labels do not fit a phone.
 */
export function SimpleTabs<T extends string>({ tabs, defaultValue, value, onChange }: SimpleTabsProps<T>) {
  return (
    <Tabs.Root
      variant="plain"
      lazyMount
      unmountOnExit
      defaultValue={value === undefined ? (defaultValue ?? tabs[0]?.value) : undefined}
      value={value}
      onValueChange={(details) => onChange?.(details.value as T)}
    >
      <Box overflowX="auto" mx="-1" px="1" pb="1.5">
        <Tabs.List bg="bg.muted" borderRadius="full" p="1" gap="0.5" display="inline-flex" minW="max-content">
          {tabs.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              borderRadius="full"
              fontWeight="bold"
              color="fg.muted"
              px="4"
              h="9"
              whiteSpace="nowrap"
              _hover={{ color: 'fg' }}
              _selected={{ color: 'brand.contrast', _hover: { color: 'brand.contrast' } }}
            >
              {tab.icon}
              {tab.label}
              {tab.badge}
            </Tabs.Trigger>
          ))}
          <Tabs.Indicator borderRadius="full" bg="brand.solid" boxShadow="0 2px 0 0 {colors.brand.depth}" css={{ transitionTimingFunction: 'cubic-bezier(0.3, 1.4, 0.5, 1)', transitionDuration: '320ms' }} />
        </Tabs.List>
      </Box>
      {tabs.map((tab) => (
        <Tabs.Content key={tab.value} value={tab.value} pt="3">
          {tab.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
