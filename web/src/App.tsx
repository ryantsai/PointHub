import { lazy } from 'react';
import { Route, Routes } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { RequireAuth, RequireRole } from './components/guards';
import { CheckInPage } from './pages/CheckInPage';
import { DashboardPage } from './pages/DashboardPage';
import { GiftsPage } from './pages/GiftsPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Host and admin screens are loaded on demand so employees on phones only download what they use.
const ApiClientsPage = lazy(() => import('./pages/admin/ApiClientsPage').then((m) => ({ default: m.ApiClientsPage })));
const AuditPage = lazy(() => import('./pages/admin/AuditPage').then((m) => ({ default: m.AuditPage })));
const ClaimsPage = lazy(() => import('./pages/admin/ClaimsPage').then((m) => ({ default: m.ClaimsPage })));
const EmailPage = lazy(() => import('./pages/admin/EmailPage').then((m) => ({ default: m.EmailPage })));
const ThemesPage = lazy(() => import('./pages/admin/ThemesPage').then((m) => ({ default: m.ThemesPage })));
const EmployeesPage = lazy(() => import('./pages/admin/EmployeesPage').then((m) => ({ default: m.EmployeesPage })));
const GiftsAdminPage = lazy(() => import('./pages/admin/GiftsAdminPage').then((m) => ({ default: m.GiftsAdminPage })));
const LedgerPage = lazy(() => import('./pages/admin/LedgerPage').then((m) => ({ default: m.LedgerPage })));
const EventDetailPage = lazy(() => import('./pages/host/EventDetailPage').then((m) => ({ default: m.EventDetailPage })));
const HostEventsPage = lazy(() => import('./pages/host/HostEventsPage').then((m) => ({ default: m.HostEventsPage })));

/**
 * Route map. Guards only hide pages; every rule is enforced again by the API.
 *   /login                 anonymous
 *   /, /gifts, /c/:token   any signed-in employee
 *   /host/*                eventAdmin, systemAdmin
 *   /admin/ledger|employees|audit   systemAdmin, auditor (auditor is read-only)
 *   /admin/gifts|claims    giftAdmin, systemAdmin
 *   /admin/themes|email|api-clients   systemAdmin
 */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="c/:token" element={<CheckInPage />} />
          <Route path="gifts" element={<GiftsPage />} />
          <Route element={<RequireRole permission="host" />}>
            <Route path="host/events" element={<HostEventsPage />} />
            <Route path="host/events/:id" element={<EventDetailPage />} />
          </Route>
          <Route element={<RequireRole permission="viewAdmin" />}>
            <Route path="admin/ledger" element={<LedgerPage />} />
            <Route path="admin/employees" element={<EmployeesPage />} />
            <Route path="admin/audit" element={<AuditPage />} />
          </Route>
          <Route element={<RequireRole permission="manageGifts" />}>
            <Route path="admin/gifts" element={<GiftsAdminPage />} />
            <Route path="admin/claims" element={<ClaimsPage />} />
          </Route>
          <Route element={<RequireRole permission="admin" />}>
            <Route path="admin/themes" element={<ThemesPage />} />
            <Route path="admin/email" element={<EmailPage />} />
            <Route path="admin/api-clients" element={<ApiClientsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
