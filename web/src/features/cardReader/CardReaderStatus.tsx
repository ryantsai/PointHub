import { Box, Flex, Portal, Text, Tooltip } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import type { BridgeStatus } from './bridge';

/** One-line live status of the local PC/SC bridge, for screens that read cards. Renders nothing while off. */
export function CardReaderStatus({ bridge }: { bridge: BridgeStatus }) {
  const { t } = useTranslation();
  if (bridge.state === 'off') return null;

  const connected = bridge.state === 'connected';
  const connectedWithoutReader = connected && bridge.readers.length === 0;
  const ready = connected && !connectedWithoutReader;
  const text =
    bridge.state === 'connecting'
      ? t('cardReader.bridgeConnecting')
      : bridge.state === 'unavailable'
        ? t('cardReader.bridgeUnavailable')
        : connectedWithoutReader
          ? t('cardReader.bridgeNoReader')
          : t('cardReader.bridgeConnected', { count: bridge.readers.length });

  const line = (
    <Text fontSize="xs" fontWeight="semibold" color="fg.muted" lineHeight="1.4" tabIndex={bridge.readers.length > 0 ? 0 : undefined} borderRadius="l1" focusVisibleRing="outside">
      {text}
      {bridge.error ? ` · ${t('cardReader.bridgeError', { message: bridge.error })}` : ''}
    </Text>
  );

  return (
    <Flex align="center" gap="2" minW="0" role="status" aria-live="polite">
      {/* The colour only repeats what the text says: green = reader ready, yellow = bridge without a reader, grey = no bridge. */}
      <Box
        aria-hidden
        data-ambient=""
        position="relative"
        flexShrink={0}
        boxSize="2.5"
        borderRadius="full"
        bg={ready ? 'green.solid' : connectedWithoutReader ? 'yellow.solid' : 'border.emphasized'}
        transition="background-color 200ms"
        _before={ready ? { content: '""', position: 'absolute', inset: 0, borderRadius: 'full', bg: 'green.solid', animation: 'phPing 2.2s ease-out infinite' } : undefined}
      />
      {bridge.readers.length === 0 ? (
        line
      ) : (
        <Tooltip.Root openDelay={200} positioning={{ placement: 'top-start' }}>
          <Tooltip.Trigger asChild>{line}</Tooltip.Trigger>
          <Portal>
            <Tooltip.Positioner>
              <Tooltip.Content maxW="320px">{bridge.readers.join(', ')}</Tooltip.Content>
            </Tooltip.Positioner>
          </Portal>
        </Tooltip.Root>
      )}
    </Flex>
  );
}
