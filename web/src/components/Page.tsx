import { Box, Flex, Heading, Text } from '@chakra-ui/react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { itemVariants, listVariants, pageVariants } from '../lib/motion';

// Text that sits directly on the page background gets a halo in the background colour, so an ambient sprite
// drifting behind it never touches the letters.
const HALO = '0 0 2px {colors.bg}, 0 0 6px {colors.bg}, 0 0 10px {colors.bg}';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Buttons on the right (they wrap under the title on phones). */
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Flex justify="space-between" align="flex-end" wrap="wrap" gap="3">
      <Box minW="0">
        <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="extrabold" lineHeight="1.2" letterSpacing="-0.02em" textShadow={HALO}>
          {title}
        </Heading>
        {subtitle && (
          <Text color="fg.muted" fontSize="sm" fontWeight="medium" mt="1" textShadow={HALO}>
            {subtitle}
          </Text>
        )}
      </Box>
      {actions && (
        <Flex gap="2" wrap="wrap">
          {actions}
        </Flex>
      )}
    </Flex>
  );
}

interface PageProps extends Partial<PageHeaderProps> {
  children: ReactNode;
}

/** Standard page frame: orchestrated entrance, title row, optional actions on the right. Omit `title` for a custom hero. */
export function Page({ title, subtitle, actions, children }: PageProps) {
  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible">
      <Flex direction="column" gap={{ base: '6', md: '8' }}>
        {title && <PageHeader title={title} subtitle={subtitle} actions={actions} />}
        {children}
      </Flex>
    </motion.div>
  );
}

/** Children wrapped in <StaggerItem> rise in one after another. */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={listVariants} initial="hidden" animate="visible" className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className} style={{ minWidth: 0 }}>
      {children}
    </motion.div>
  );
}
