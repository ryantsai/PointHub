// Mock data shared by every design alternative, so the six designs differ only in design.
// Shapes follow docs/api.md (LocalizedText, Transaction, EventSummary, Gift, CheckIn) but are trimmed.
// This folder must stay dependency-free TypeScript (no React, no npm imports).

export type Locale = 'en' | 'ja' | 'zh-Hant';
export type LocalizedText = { en: string; ja: string; zhHant: string };

export const pick = (text: LocalizedText, locale: Locale): string =>
  locale === 'ja' ? text.ja : locale === 'zh-Hant' ? text.zhHant : text.en;

export const me = {
  employeeNo: 'E0101',
  displayName: { en: 'Taylor Lin', ja: '林 テイラー', zhHant: '林 泰樂' } as LocalizedText,
  department: { en: 'Engineering', ja: '開発部', zhHant: '研發部' } as LocalizedText,
  balance: 1280,
  lifetimeEarned: 2140,
  lifetimeSpent: 860,
  rank: 12,             // position on the optional leaderboard
  nextRewardAt: 1500,   // points needed for the next gift on the wish list
};

export type TransactionType = 'eventAward' | 'redemption' | 'adjustment' | 'reversal' | 'externalCredit' | 'externalDebit';

export type Transaction = {
  id: number;
  employeeNo: string;
  employeeName: string;
  amount: number; // signed
  type: TransactionType;
  title: LocalizedText; // what the points were for
  createdAt: string; // ISO
  reverted?: boolean;
  source?: string; // API client name for external transactions
};

const T = (en: string, ja: string, zhHant: string): LocalizedText => ({ en, ja, zhHant });

export const myTransactions: Transaction[] = [
  { id: 9104, employeeNo: 'E0101', employeeName: 'Taylor Lin', amount: 50, type: 'eventAward', title: T('Year-end Kickoff', '年末キックオフ', '年終啟動大會'), createdAt: '2026-11-24T10:12:00+08:00' },
  { id: 9088, employeeNo: 'E0101', employeeName: 'Taylor Lin', amount: -80, type: 'redemption', title: T('Company Mug', 'オリジナルマグカップ', '公司馬克杯'), createdAt: '2026-11-21T15:40:00+08:00' },
  { id: 9051, employeeNo: 'E0101', employeeName: 'Taylor Lin', amount: 120, type: 'eventAward', title: T('Beach Clean-up Volunteer Day', 'ビーチクリーン・ボランティア', '淨灘志工日'), createdAt: '2026-11-10T09:05:00+08:00' },
  { id: 9034, employeeNo: 'E0101', employeeName: 'Taylor Lin', amount: 25, type: 'externalCredit', title: T('Wellness survey completed', '健康アンケート回答', '完成健康問卷'), createdAt: '2026-11-06T11:20:00+08:00', source: 'Survey tool' },
  { id: 9012, employeeNo: 'E0101', employeeName: 'Taylor Lin', amount: -20, type: 'externalDebit', title: T('Canteen lunch upgrade', '社員食堂ランチアップグレード', '員工餐廳加購'), createdAt: '2026-11-03T12:31:00+08:00', source: 'Canteen kiosk' },
  { id: 8990, employeeNo: 'E0101', employeeName: 'Taylor Lin', amount: 200, type: 'eventAward', title: T('Autumn Hackathon', '秋のハッカソン', '秋季黑客松'), createdAt: '2026-10-25T18:00:00+08:00' },
];

export type EventStatus = 'open' | 'upcoming' | 'closed';
export type MyCheckIn = 'none' | 'pending' | 'approved';

export type EventItem = {
  id: number;
  title: LocalizedText;
  location: LocalizedText;
  startsAt: string;
  endsAt: string;
  points: number;
  status: EventStatus;
  myCheckIn: MyCheckIn;
  attendees: number;
  capacity: number | null;
  emoji: string; // stand-in for event artwork
};

export const events: EventItem[] = [
  { id: 1, title: T('Year-end Kickoff', '年末キックオフ', '年終啟動大會'), location: T('HQ 12F Hall', '本社12階ホール', '總部 12 樓大廳'), startsAt: '2026-11-25T14:00:00+08:00', endsAt: '2026-11-25T18:00:00+08:00', points: 50, status: 'open', myCheckIn: 'none', attendees: 86, capacity: 200, emoji: '🎉' },
  { id: 2, title: T('Security Awareness Workshop', 'セキュリティ研修', '資安意識工作坊'), location: T('Online', 'オンライン', '線上'), startsAt: '2026-12-03T10:00:00+08:00', endsAt: '2026-12-03T12:00:00+08:00', points: 30, status: 'upcoming', myCheckIn: 'none', attendees: 0, capacity: null, emoji: '🛡️' },
  { id: 3, title: T('Winter Charity Run', 'ウィンターチャリティラン', '冬季公益路跑'), location: T('Riverside Park', '河川敷公園', '河濱公園'), startsAt: '2026-12-13T07:30:00+08:00', endsAt: '2026-12-13T11:00:00+08:00', points: 150, status: 'upcoming', myCheckIn: 'none', attendees: 0, capacity: 120, emoji: '🏃' },
  { id: 4, title: T('Blood Donation Day', '献血デー', '捐血日'), location: T('HQ Lobby', '本社ロビー', '總部大廳'), startsAt: '2026-11-24T09:00:00+08:00', endsAt: '2026-11-24T16:00:00+08:00', points: 80, status: 'open', myCheckIn: 'pending', attendees: 41, capacity: 60, emoji: '🩸' },
];

export type Gift = {
  id: number;
  name: LocalizedText;
  description: LocalizedText;
  pointCost: number;
  stock: number;
  emoji: string; // stand-in for a product photo
  tag?: 'new' | 'popular' | 'limited';
};

export const gifts: Gift[] = [
  { id: 1, name: T('Coffee Voucher', 'コーヒーチケット', '咖啡兌換券'), description: T('One drink at the lobby café.', 'ロビーカフェのドリンク1杯。', '大廳咖啡廳飲品一杯。'), pointCost: 30, stock: 200, emoji: '☕', tag: 'popular' },
  { id: 2, name: T('Company Mug', 'オリジナルマグカップ', '公司馬克杯'), description: T('Ceramic, 350 ml.', '陶器製、350ml。', '陶瓷，350 毫升。'), pointCost: 80, stock: 39, emoji: '🍵' },
  { id: 3, name: T('Movie Ticket Pair', '映画ペアチケット', '電影雙人票'), description: T('Valid at partner cinemas for 6 months.', '提携映画館で6か月有効。', '合作影城，六個月內有效。'), pointCost: 400, stock: 12, emoji: '🎬', tag: 'new' },
  { id: 4, name: T('Wireless Earbuds', 'ワイヤレスイヤホン', '無線耳機'), description: T('Noise cancelling, 24 h battery.', 'ノイズキャンセリング、24時間バッテリー。', '主動降噪，24 小時續航。'), pointCost: 1500, stock: 3, emoji: '🎧', tag: 'limited' },
  { id: 5, name: T('Extra Half-day Off', '半日休暇', '半天特休'), description: T('Subject to manager approval.', '上長の承認が必要です。', '需經主管核准。'), pointCost: 500, stock: 10, emoji: '🌴' },
  { id: 6, name: T('Charity Donation', 'チャリティ寄付', '公益捐款'), description: T('We donate NT$300 in your name.', 'あなたの名義でNT$300を寄付します。', '以您的名義捐出新台幣 300 元。'), pointCost: 100, stock: 0, emoji: '💝' },
];

// ---- Admin side -----------------------------------------------------------------------------

export const kpis = {
  pointsIssuedThisMonth: 48250,
  pointsIssuedDelta: 0.18, // vs last month
  pointsRedeemedThisMonth: 21900,
  pointsRedeemedDelta: -0.06,
  activeParticipants: 312,
  totalEmployees: 420,
  pendingApprovals: 6,
  outstandingPoints: 386400, // liability
  // 12 weekly totals for a sparkline / area chart
  issuedByWeek: [6200, 7100, 5400, 8800, 9300, 7600, 10400, 9800, 11200, 12600, 11900, 13800],
  redeemedByWeek: [2100, 3400, 2900, 4100, 3800, 5200, 4700, 5100, 4400, 6300, 5600, 5900],
};

export type PendingCheckIn = {
  id: number;
  employeeNo: string;
  employeeName: LocalizedText;
  department: LocalizedText;
  eventTitle: LocalizedText;
  points: number;
  onRoster: boolean;
  method: 'link' | 'card';
  checkedInAt: string;
};

export const pendingCheckIns: PendingCheckIn[] = [
  { id: 501, employeeNo: 'E0102', employeeName: T('Taro Tanaka', '田中 太郎', '田中 太郎'), department: T('Sales', '営業部', '業務部'), eventTitle: T('Year-end Kickoff', '年末キックオフ', '年終啟動大會'), points: 50, onRoster: true, method: 'link', checkedInAt: '2026-11-25T14:02:10+08:00' },
  { id: 502, employeeNo: 'E0103', employeeName: T('Chih-Ming Chen', '陳 志明', '陳 志明'), department: T('R&D', '研究開発部', '研發部'), eventTitle: T('Year-end Kickoff', '年末キックオフ', '年終啟動大會'), points: 50, onRoster: true, method: 'link', checkedInAt: '2026-11-25T14:02:44+08:00' },
  { id: 503, employeeNo: 'E0188', employeeName: T('Mei-Ling Wang', '王 美玲', '王 美玲'), department: T('Finance', '経理部', '財務部'), eventTitle: T('Year-end Kickoff', '年末キックオフ', '年終啟動大會'), points: 50, onRoster: false, method: 'link', checkedInAt: '2026-11-25T14:03:05+08:00' },
  { id: 504, employeeNo: 'E0211', employeeName: T('Morgan Lee', 'モーガン・リー', '李 摩根'), department: T('Engineering', '開発部', '研發部'), eventTitle: T('Blood Donation Day', '献血デー', '捐血日'), points: 80, onRoster: true, method: 'card', checkedInAt: '2026-11-25T14:03:30+08:00' },
  { id: 505, employeeNo: 'E0240', employeeName: T('Hanako Sato', '佐藤 花子', '佐藤 花子'), department: T('General Affairs', '総務部', '總務部'), eventTitle: T('Blood Donation Day', '献血デー', '捐血日'), points: 80, onRoster: true, method: 'link', checkedInAt: '2026-11-25T14:04:12+08:00' },
  { id: 506, employeeNo: 'E0307', employeeName: T('Yi-Chun Lin', '林 怡君', '林 怡君'), department: T('Welfare Committee', '福利厚生委員会', '福利委員會'), eventTitle: T('Year-end Kickoff', '年末キックオフ', '年終啟動大會'), points: 50, onRoster: false, method: 'link', checkedInAt: '2026-11-25T14:05:01+08:00' },
];

export const ledger: Transaction[] = [
  { id: 9110, employeeNo: 'E0240', employeeName: '佐藤 花子', amount: 50, type: 'eventAward', title: T('Year-end Kickoff', '年末キックオフ', '年終啟動大會'), createdAt: '2026-11-25T14:01:00+08:00' },
  { id: 9109, employeeNo: 'E0103', employeeName: '陳 志明', amount: -400, type: 'redemption', title: T('Movie Ticket Pair', '映画ペアチケット', '電影雙人票'), createdAt: '2026-11-25T11:47:00+08:00' },
  { id: 9108, employeeNo: 'E0188', employeeName: '王 美玲', amount: 500, type: 'adjustment', title: T('Service award (5 years)', '勤続5年表彰', '服務滿五年獎勵'), createdAt: '2026-11-25T10:30:00+08:00' },
  { id: 9107, employeeNo: 'E0102', employeeName: '田中 太郎', amount: -20, type: 'externalDebit', title: T('Canteen lunch upgrade', '社員食堂ランチアップグレード', '員工餐廳加購'), createdAt: '2026-11-25T12:05:00+08:00', source: 'Canteen kiosk' },
  { id: 9106, employeeNo: 'E0211', employeeName: 'Morgan Lee', amount: -120, type: 'reversal', title: T('Beach Clean-up Volunteer Day', 'ビーチクリーン・ボランティア', '淨灘志工日'), createdAt: '2026-11-24T17:20:00+08:00' },
  { id: 9105, employeeNo: 'E0211', employeeName: 'Morgan Lee', amount: 120, type: 'eventAward', title: T('Beach Clean-up Volunteer Day', 'ビーチクリーン・ボランティア', '淨灘志工日'), createdAt: '2026-11-10T09:06:00+08:00', reverted: true },
  { id: 9104, employeeNo: 'E0101', employeeName: 'Taylor Lin', amount: 50, type: 'eventAward', title: T('Year-end Kickoff', '年末キックオフ', '年終啟動大會'), createdAt: '2026-11-24T10:12:00+08:00' },
  { id: 9103, employeeNo: 'E0307', employeeName: '林 怡君', amount: 25, type: 'externalCredit', title: T('Wellness survey completed', '健康アンケート回答', '完成健康問卷'), createdAt: '2026-11-24T09:15:00+08:00', source: 'Survey tool' },
];

export const leaderboard = [
  { rank: 1, name: '佐藤 花子', points: 3420 },
  { rank: 2, name: '陳 志明', points: 3180 },
  { rank: 3, name: 'Morgan Lee', points: 2950 },
  { rank: 4, name: '王 美玲', points: 2710 },
  { rank: 5, name: '田中 太郎', points: 2540 },
];
