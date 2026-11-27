// Mirrors docs/api.md. Change the contract there first, then here.

/** A signed-in person with no role is a normal employee. `systemAdmin` implies every other role. */
export type Role = 'systemAdmin' | 'eventAdmin' | 'giftAdmin' | 'auditor';
export type Locale = 'en' | 'ja' | 'zh-Hant';
export type LocalizedText = { en: string; ja: string | null; zhHant: string | null };
export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };
export type Problem = {
  title: string;
  status: number;
  code: string;
  detail?: string;
  errors?: Record<string, string[]>;
};

// Site
export type AuthMode = 'dev' | 'oidc' | 'windows';
export type SiteConfig = {
  appName: string;
  /** `dev`: pick a seeded account. `oidc`: Microsoft Entra ID. `windows`: integrated Windows authentication through IIS (on-premises AD). */
  authMode: AuthMode;
  publicBaseUrl: string | null;
  /** A `ThemeKey`. Typed as string because a newer server may send a key this build does not know (→ `default`). */
  activeTheme: ThemeKey | (string & {});
  supportedLocales: Locale[];
  defaultLocale: Locale;
};

/** Seasonal themes: the standard look plus twelve Taiwanese festivals. Fixed by the contract. */
export type ThemeKey =
  | 'default'
  | 'new-year'
  | 'lunar-new-year'
  | 'lantern-festival'
  | 'qingming'
  | 'dragon-boat'
  | 'qixi'
  | 'ghost-festival'
  | 'mid-autumn'
  | 'national-day'
  | 'double-ninth'
  | 'winter-solstice'
  | 'christmas';

// Auth
export type Me = {
  id: number;
  employeeNo: string;
  displayName: string;
  email: string;
  department: string | null;
  roles: Role[];
  preferredLocale: Locale | null;
  balance: number;
};
export type DevUser = { employeeNo: string; displayName: string; roles: Role[] };

// Me
export type TransactionType =
  | 'eventAward'
  | 'redemption'
  | 'adjustment'
  | 'reversal'
  | 'expiry'
  | 'externalCredit'
  | 'externalDebit';
export type Transaction = {
  id: number;
  employeeId: number;
  employeeNo: string;
  employeeName: string;
  amount: number;
  type: TransactionType;
  reason: string | null;
  eventId: number | null;
  eventTitle: LocalizedText | null;
  redemptionId: number | null;
  /** The gift of the claim this row paid for, or that a cancel / refund gave back. */
  giftName: LocalizedText | null;
  reversesTransactionId: number | null;
  reversedByTransactionId: number | null;
  createdAt: string;
  createdByName: string | null;
  /** Set when another application created the transaction through the integration API. */
  apiClientName: string | null;
  externalReference: string | null;
};
export type MyPoints = {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  transactions: Paged<Transaction>;
};

// Events and check-in
export type EventStatus = 'draft' | 'open' | 'closed' | 'cancelled';
export type ApprovalMode = 'manual' | 'autoApproveRoster' | 'autoApproveAll';
export type CheckInStatus = 'pending' | 'approved' | 'rejected' | 'reverted';
/** roster: a host awarded points to the imported roster (attendance recorded elsewhere, e.g. an online event). */
export type CheckInMethod = 'link' | 'card' | 'manual' | 'roster';
/** static: one link per event (posters). rotating: the code on the host's screen changes every few seconds. */
export type CheckInMode = 'static' | 'rotating';
export type EventSummary = {
  id: number;
  title: LocalizedText;
  description: LocalizedText | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  points: number;
  status: EventStatus;
  approvalMode: ApprovalMode;
  checkInMode: CheckInMode;
  myCheckInStatus: CheckInStatus | null;
};
export type CheckInPreview = { event: EventSummary; canCheckIn: boolean; blockedCode: string | null };
export type CheckIn = {
  id: number;
  eventId: number;
  eventTitle: LocalizedText;
  employeeId: number;
  employeeNo: string;
  employeeName: string;
  department: string | null;
  method: CheckInMethod;
  status: CheckInStatus;
  onRoster: boolean;
  points: number;
  checkedInAt: string;
  decidedAt: string | null;
  decidedByName: string | null;
  note: string | null;
};

// Host
export type EventInput = {
  title: LocalizedText;
  description: LocalizedText | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  points: number;
  approvalMode: ApprovalMode;
  checkInMode: CheckInMode;
  rosterOnly: boolean;
  maxParticipants: number | null;
};
/** Current code of a `rotating` event. The QR URL is `${base}/c/${checkInToken}?k=${code}`. */
export type RotatingCode = {
  code: string;
  /** When the next code starts (server clock). The old code stays valid for a short grace period. */
  expiresAt: string;
  periodSeconds: number;
};
export type EventDetail = EventSummary & {
  checkInToken: string;
  rosterOnly: boolean;
  maxParticipants: number | null;
  hosts: { id: number; displayName: string }[];
  counts: { pending: number; approved: number; rejected: number; roster: number; rosterUnmatched: number };
};
export type RosterMatchStatus = 'matched' | 'notFound' | 'inactive' | 'duplicate';
export type RosterEntry = {
  id: number;
  employeeNo: string;
  name: string | null;
  email: string | null;
  matchStatus: RosterMatchStatus;
  employeeId: number | null;
  employeeName: string | null;
  checkInStatus: CheckInStatus | null;
};
export type RosterImportResult = {
  total: number;
  matched: number;
  notFound: number;
  inactive: number;
  duplicate: number;
  entries: RosterEntry[];
};
export type RosterAwardSkipReason = 'alreadyDecided' | 'notMatched' | 'inactive' | 'eventFull';
export type RosterAwardResult = {
  awarded: number;          // attendance recorded and points awarded
  approvedPending: number;  // waiting self check-ins approved
  alreadyAwarded: number;   // approved before; left alone
  skipped: { employeeNo: string; name: string | null; reason: RosterAwardSkipReason }[];
};

// Gifts
/** `url` is site-relative (`/uploads/assets/{id}.webp`); every image is the same square size. */
export type GiftImage = { id: string; url: string; width: number; height: number };
export type Gift = {
  id: number;
  name: LocalizedText;
  description: LocalizedText | null;
  /** Square, normalised pictures in display order (may be empty). */
  images: GiftImage[];
  pointCost: number;
  stock: number;
  /** `false` = disabled: hidden from the catalogue and cannot be claimed. Claims that already exist are not affected. */
  isActive: boolean;
  /** How many one person may claim in total: any whole number from 1 up, or `null` for unlimited. */
  perEmployeeLimit: number | null;
  /** How many the signed-in person has claimed so far (cancelled and refunded claims do not count). */
  claimedByMe: number;
};
export type GiftInput = Omit<Gift, 'id' | 'stock' | 'images' | 'claimedByMe'> & { initialStock?: number };
/** `cancelled`: taken back before the hand-over. `refunded`: taken back after it. Both return the points. */
export type RedemptionStatus = 'requested' | 'fulfilled' | 'cancelled' | 'refunded';
export type Redemption = {
  id: number;
  giftId: number;
  giftName: LocalizedText;
  /** The gift's cover picture, also when the gift has since been disabled. */
  giftImage: GiftImage | null;
  quantity: number;
  pointsSpent: number;
  status: RedemptionStatus;
  employeeId: number;
  employeeNo: string;
  employeeName: string;
  requestedAt: string;
  closedAt: string | null;
  closedByName: string | null;
  /** The reason given when the claim was cancelled or refunded. */
  note: string | null;
};

// Admin
/**
 * The numbers on the admin dashboard. "Issued" = event awards, adjustments and external credits, net of their
 * reverts; "redeemed" = gift claims and external debits, net of refunds. Months and weeks are in the site time zone.
 */
export type AdminStats = {
  pointsIssuedThisMonth: number;
  pointsIssuedLastMonth: number;
  pointsRedeemedThisMonth: number;
  pointsRedeemedLastMonth: number;
  /** Active employees with at least one approved check-in in the last 90 days. */
  activeParticipants: number;
  /** Active employees. */
  totalEmployees: number;
  /** Sum of all balances. */
  outstandingPoints: number;
  /** Waiting for approval, all events. */
  pendingCheckIns: number;
  /** Claims not yet handed over. */
  openClaims: number;
  /** The last 12 weeks, oldest first; `weekStart` is a Monday, `YYYY-MM-DD`. */
  weeks: AdminStatsWeek[];
};
export type AdminStatsWeek = { weekStart: string; issued: number; redeemed: number };
export type Card = { id: number; uid: string; label: string | null; isActive: boolean; registeredAt: string };
export type Employee = {
  id: number;
  employeeNo: string;
  displayName: string;
  email: string;
  department: string | null;
  isActive: boolean;
  roles: Role[];
  balance: number;
  cards: Card[];
};
/** `GET /api/admin/employees/{id}`: one person with their totals (the lookup page). */
export type EmployeeDetail = Employee & {
  lifetimeEarned: number;
  lifetimeSpent: number;
  preferredLocale: Locale | null;
  createdAt: string;
  /** Created at first sign-in, not yet confirmed by the HR push. */
  isProvisional: boolean;
  /** Approved check-ins. */
  checkInCount: number;
  /** Claims that still count (not cancelled or refunded). */
  claimCount: number;
};
export type ApiScope = 'points:read' | 'points:write' | 'employees:write';
export type ApiClient = {
  id: number;
  name: string;
  keyPrefix: string;
  scopes: ApiScope[];
  isActive: boolean;
  createdAt: string;
  createdByName: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};
export type ApiClientInput = { name: string; scopes: ApiScope[]; expiresAt: string | null };
/** `apiKey` is returned exactly once, at creation. Never persist it client-side. */
export type ApiClientCreated = { client: ApiClient; apiKey: string };
export type AuditEntry = {
  id: number;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string | null;
  createdAt: string;
};

// Seasonal theme settings (system admin)
export type ThemeMode = 'calendar' | 'forced';
export type ThemeSettingsInput = {
  mode: ThemeMode;
  /** Required when `mode` is `forced`. */
  forcedThemeKey: ThemeKey | null;
  /** Festivals the calendar skips. */
  disabledThemeKeys: ThemeKey[];
};
/** Dates are `YYYY-MM-DD` in the site time zone, inclusive. */
export type ThemeWindow = { themeKey: ThemeKey; festivalDate: string; startsOn: string; endsOn: string };
export type ThemeSettings = ThemeSettingsInput & {
  activeTheme: ThemeKey;
  /** What the calendar alone would show today. */
  calendarTheme: ThemeKey;
  today: string;
  /** The next 12 months, ordered by `startsOn`, skipped festivals included. */
  calendar: ThemeWindow[];
};

// Email (system admin)
export type EmailTemplateKey =
  | 'checkInApproved'
  | 'checkInRejected'
  | 'redemptionRequested'
  | 'redemptionFulfilled'
  | 'redemptionCancelled'
  | 'redemptionRefunded'
  | 'pointsAdjusted';
export type EmailTemplate = {
  key: EmailTemplateKey;
  locale: Locale;
  subject: string;
  /** Plain text with `{{placeholders}}`; blank lines separate paragraphs. */
  body: string;
  isCustomized: boolean;
  /** Per key, the same in every locale. */
  isEnabled: boolean;
  placeholders: string[];
};
export type SmtpSecurity = 'none' | 'startTls' | 'ssl';
export type EmailSettings = {
  smtp: {
    configured: boolean;
    host: string | null;
    port: number;
    security: SmtpSecurity;
    fromAddress: string | null;
    fromName: string | null;
    authenticated: boolean;
  };
  queue: { pending: number; failed: number; sentLast24Hours: number };
  /** Every key in every locale. */
  templates: EmailTemplate[];
};
export type EmailPreviewInput = { key: EmailTemplateKey; locale: Locale; subject: string; body: string };
export type EmailPreview = { subject: string; text: string; html: string };
export type EmailTestInput = { to: string; key: EmailTemplateKey; locale: Locale };
export type EmailTestResult = { ok: boolean; error: string | null };
/** `skipped`: SMTP is not configured. */
export type EmailStatus = 'pending' | 'sent' | 'failed' | 'skipped';
export type EmailLogEntry = {
  id: number;
  to: string;
  subject: string;
  templateKey: EmailTemplateKey | null;
  status: EmailStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
};
