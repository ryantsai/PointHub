import { Box, Button, Center, Flex, Spinner, Text } from '@chakra-ui/react';
import { CameraOff, ScanQrCode } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useSiteConfig } from '../api/auth';
import { basePath } from '../lib/basePath';
import { parseCheckInLink } from '../lib/checkInLink';
import { Modal } from './ui/Modal';
import { Notice } from './ui/Notice';

// The Shape Detection API is not in TypeScript's DOM library yet.
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

/**
 * `unsupported`: no BarcodeDetector, no camera API, or an insecure page (plain http on a LAN address).
 * `blocked`: the camera was refused, is missing, or is in use elsewhere.
 */
type Phase = 'unsupported' | 'starting' | 'scanning' | 'blocked';

const SCAN_EVERY_MS = 200;

/** The detector, when this page can scan at all: a secure context with both a camera API and BarcodeDetector. */
function findDetector(): BarcodeDetectorConstructor | null {
  if (typeof window === 'undefined' || !window.isSecureContext) return null;
  const media = navigator.mediaDevices as MediaDevices | undefined;
  if (typeof media?.getUserMedia !== 'function') return null;
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector ?? null;
}

/** One corner bracket of the viewfinder. */
function Corner({ top, left }: { top: boolean; left: boolean }) {
  return (
    <Box
      aria-hidden
      position="absolute"
      boxSize="9"
      top={top ? '14%' : undefined}
      bottom={top ? undefined : '14%'}
      left={left ? '14%' : undefined}
      right={left ? undefined : '14%'}
      borderColor="accent.solid"
      borderTopWidth={top ? '4px' : 0}
      borderBottomWidth={top ? 0 : '4px'}
      borderLeftWidth={left ? '4px' : 0}
      borderRightWidth={left ? 0 : '4px'}
    />
  );
}

/** What to do instead when this device cannot scan here. Never a dead end: the phone's own camera always works. */
function Fallback({ blocked, onRetry }: { blocked: boolean; onRetry?: () => void }) {
  const { t } = useTranslation();
  const Icon = blocked ? CameraOff : ScanQrCode;
  return (
    <Flex direction="column" align="center" gap="3" py="3" textAlign="center" role="status">
      <Center boxSize="16" borderRadius="full" bg="brand.subtle" color="brand.fg" borderWidth="2px" borderColor="brand.muted">
        <Icon size={30} strokeWidth={2.2} aria-hidden />
      </Center>
      <Text fontWeight="extrabold" fontSize="md" lineHeight="1.35">
        {blocked ? t('scanner.blockedTitle') : t('scanner.unsupportedTitle')}
      </Text>
      <Text color="fg.muted" fontWeight="medium" fontSize="sm" lineHeight="1.5" maxW="xs">
        {t('scanner.fallback')}
      </Text>
      {blocked && (
        <Text color="fg.muted" fontSize="xs" fontWeight="medium" lineHeight="1.5" maxW="xs">
          {t('scanner.blockedHint')}
        </Text>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('app.retry')}
        </Button>
      )}
    </Flex>
  );
}

/** Owns the camera for as long as it is mounted, and gives it back the moment it unmounts. */
function Viewfinder({ onRead, onRetry }: { onRead: (path: string) => void; onRetry: () => void }) {
  const { t } = useTranslation();
  const { data: config } = useSiteConfig();
  const [Detector] = useState(findDetector);
  const [phase, setPhase] = useState<Phase>(Detector ? 'starting' : 'unsupported');
  const [foreign, setForeign] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  /** True when the code was a check-in link of this site and the scan is over. Anything else is ignored. */
  const handle = useEffectEvent((raw: string): boolean => {
    const path = parseCheckInLink(raw, config?.publicBaseUrl, window.location.origin + basePath);
    if (path === null) {
      setForeign(true);
      return false;
    }
    onRead(path);
    return true;
  });

  useEffect(() => {
    if (!Detector) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    const video = videoRef.current;

    const release = () => {
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      if (video) video.srcObject = null;
    };

    const start = async () => {
      if (Detector.getSupportedFormats && !(await Detector.getSupportedFormats()).includes('qr_code')) {
        if (!cancelled) setPhase('unsupported');
        return;
      }
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      // Closed while the permission prompt was up: hand the camera straight back.
      if (cancelled || !video) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = media;
      video.srcObject = media;
      await video.play();
      if (cancelled) return;
      setPhase('scanning');

      const detector = new Detector({ formats: ['qr_code'] });
      const scan = async () => {
        if (cancelled) return;
        try {
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const codes = await detector.detect(video);
            if (cancelled) return;
            if (codes.some((code) => handle(code.rawValue))) return;
          }
        } catch {
          // A frame that could not be read; the next one may be fine.
        }
        timer = window.setTimeout(() => void scan(), SCAN_EVERY_MS);
      };
      void scan();
    };

    start().catch(() => {
      release();
      if (!cancelled) setPhase('blocked');
    });

    return () => {
      cancelled = true;
      release();
    };
  }, [Detector]);

  if (phase === 'unsupported') return <Fallback blocked={false} />;
  if (phase === 'blocked') return <Fallback blocked onRetry={onRetry} />;

  return (
    <Flex direction="column" gap="3">
      <Box position="relative" aspectRatio="1" borderRadius="l3" overflow="hidden" bg="black" borderWidth="2px" borderColor="border.emphasized">
        <video ref={videoRef} muted playsInline aria-label={t('scanner.videoLabel')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        {phase === 'starting' ? (
          <Center position="absolute" inset="0" flexDirection="column" gap="3" color="white" role="status">
            <Spinner size="lg" borderWidth="3px" />
            <Text fontSize="sm" fontWeight="bold">
              {t('scanner.starting')}
            </Text>
          </Center>
        ) : (
          <>
            <Corner top left />
            <Corner top left={false} />
            <Corner top={false} left />
            <Corner top={false} left={false} />
            {/* the sweep says "looking", so a still picture does not read as frozen */}
            <Box aria-hidden position="absolute" inset="16%" overflow="hidden">
              {/* a box as tall as the frame slides by its own height; the line is its top edge */}
              <motion.div style={{ height: '100%' }} animate={{ y: ['0%', '100%', '0%'] }} transition={{ duration: 2.6, ease: 'easeInOut', repeat: Infinity }}>
                <Box h="3px" borderRadius="full" bg="accent.solid" opacity={0.9} />
              </motion.div>
            </Box>
          </>
        )}
      </Box>
      <Text fontSize="sm" fontWeight="semibold" color="fg.muted" textAlign="center" lineHeight="1.45">
        {t('scanner.hint')}
      </Text>
      {foreign && <Notice tone="warning" title={t('scanner.notCheckIn')} />}
    </Flex>
  );
}

/**
 * QR scanner for event check-in. Reads the camera with `BarcodeDetector` and, when it sees a PointHub
 * check-in link (this origin or the configured `publicBaseUrl`, path `/c/{token}`, optional `?k=`), opens
 * that page of the app. Any other QR content is never followed. Where the camera or the detector is not
 * available, it says what to do instead. The camera runs only while the dialog is open.
 */
export function CheckInScanner({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  return (
    <Modal opened={opened} onClose={onClose} title={t('scanner.title')} size="sm">
      {/* Unmounted the instant the dialog closes (not after its exit animation), which stops the stream. */}
      {opened && (
        <Viewfinder
          key={attempt}
          onRetry={() => setAttempt((value) => value + 1)}
          onRead={(path) => {
            onClose();
            void navigate(path);
          }}
        />
      )}
    </Modal>
  );
}
