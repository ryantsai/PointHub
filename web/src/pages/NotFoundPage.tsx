import { Button, Center, Flex, Heading, Text } from '@chakra-ui/react';
import { House } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ThemeSprite } from '../components/ui/ThemeSprite';
import { springs } from '../lib/motion';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <Center minH="50dvh" p="6">
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={springs.soft}>
        <Flex direction="column" align="center" gap="2" textAlign="center">
          <Flex align="center" gap="3" fontFamily="heading" fontSize="7xl" fontWeight="black" lineHeight="1" color="brand.fg" letterSpacing="-0.04em">
            <span>4</span>
            <ThemeSprite scale={4} bob />
            <span>4</span>
          </Flex>
          <Heading as="h1" fontSize="xl" fontWeight="extrabold" mt="3">
            {t('notFound.title')}
          </Heading>
          <Text color="fg.muted">{t('notFound.body')}</Text>
          <Button asChild mt="4">
            <Link to="/">
              <House aria-hidden />
              {t('notFound.home')}
            </Link>
          </Button>
        </Flex>
      </motion.div>
    </Center>
  );
}
