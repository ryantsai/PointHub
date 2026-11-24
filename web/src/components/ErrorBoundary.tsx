import { Button, Center, Flex, Heading, Text } from '@chakra-ui/react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Translation } from 'react-i18next';
import { ThemeSprite } from './ui/ThemeSprite';

interface State {
  failed: boolean;
}

/** Last-resort screen for render errors, so a broken page never leaves a blank window. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Translation>
        {(t) => (
          <Center minH="100dvh" p="6">
            <Flex direction="column" align="center" gap="3" maxW="420px" textAlign="center">
              <ThemeSprite scale={4} filter="grayscale(1)" opacity={0.7} />
              <Heading as="h1" fontSize="2xl" fontWeight="extrabold">
                {t('errorBoundary.title')}
              </Heading>
              <Text color="fg.muted">{t('errorBoundary.body')}</Text>
              <Button mt="2" onClick={() => window.location.reload()}>
                {t('errorBoundary.reload')}
              </Button>
            </Flex>
          </Center>
        )}
      </Translation>
    );
  }
}
