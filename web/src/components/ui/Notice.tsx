import { Alert } from '@chakra-ui/react';
import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'warning' | 'error';

interface NoticeProps extends Omit<Alert.RootProps, 'title' | 'status'> {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  /** Replaces the default status icon. */
  icon?: ReactNode;
}

const PALETTE: Record<Tone, string> = { info: 'brand', success: 'green', warning: 'orange', error: 'red' };

/** Inline message box. Replaces Mantine's `<Alert color title>`: red → error, orange/yellow → warning, default → info. */
export function Notice({ tone = 'info', title, children, icon, ...rest }: NoticeProps) {
  return (
    <Alert.Root status={tone} colorPalette={PALETTE[tone]} variant="subtle" borderRadius="l2" borderWidth="2px" borderColor="colorPalette.muted" {...rest}>
      <Alert.Indicator>{icon}</Alert.Indicator>
      <Alert.Content>
        {title && <Alert.Title fontWeight="bold">{title}</Alert.Title>}
        {children && <Alert.Description>{children}</Alert.Description>}
      </Alert.Content>
    </Alert.Root>
  );
}
