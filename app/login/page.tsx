// ============================================================
// DailyLedger — app/login/page.tsx
// Permanent redirect to /dashboard. DailyLedger is local-first
// and requires no login.
// ============================================================

import { redirect } from 'next/navigation';

export default function LoginPage() {
  redirect('/dashboard');
}
