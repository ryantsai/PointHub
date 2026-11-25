/**
 * The admin dashboard is its own chunk because it carries the chart library (Recharts). One loader, so the
 * route's `lazy()` and the idle-time warm-up in the app shell ask for the same module.
 */
export const loadAdminDashboard = () => import('./AdminDashboardPage');
