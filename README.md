# 🛡️ DailyLedger — Privacy-First Personal Finance Web Application

DailyLedger is an enterprise-grade, privacy-first personal finance management web application built with Next.js 16, React 19, TypeScript, Framer Motion, and Dexie.js (IndexedDB).

> **Privacy Guarantee**: DailyLedger **never** stores your financial records on external company servers. All financial entries are stored locally on your device in IndexedDB, with user-isolated data partitioning, AES-256-GCM client-side encrypted backup capabilities, and direct integration into your personal Google Drive account (`drive.file` minimum scope).

---

## 🚀 Features

- 🔒 **Privacy-First Local Storage**: All financial records stay in IndexedDB, partitioned strictly by `userId`.
- 🔑 **Secure Authentication**: Google OAuth 2.0 via Auth.js (NextAuth v5) and validated email credentials.
- ☁️ **Google Drive Auto-Sync**: Client-side AES-256-GCM encrypted backup directly to your private Google Drive (`DailyLedger_Backups`).
- 💸 **Full Financial CRUD & Repayment Calculator**:
  - Income (*Aamdani*)
  - Expenses (*Kharcha*)
  - Money Given (*Udhar Diya*)
  - Money Received (*Udhar Liya*)
  - Embedded Repayment Percentage & Adjustment Calculator
- ↩️ **Undo Delete**: 5-second instant recovery toast for deleted transactions.
- 📊 **Comprehensive Analytics & Reports**:
  - Daily, Weekly, Monthly, and Yearly breakdown views
  - Responsive charts powered by Recharts
  - One-click export to **CSV**, **Excel (.xls)**, and **PDF Print**
- 🤝 **Debts & Lending Ledger**: Tracks exact net balances per contact with automatic repayment direction selection.
- 👤 **Dedicated Account Dashboard**: Real-time Web Storage quota estimation, Google Drive status, and user profile management.
- ♿ **WCAG AA Compliant**: Dialog ARIA semantics, Escape key handlers, and high-contrast theme support (Dark/Light mode).

---

## 🛠️ Environment Variables Setup

Copy `.env.example` to `.env.local` before starting the application:

```bash
# Google OAuth credentials (from Google Cloud Console)
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth Secret
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=your-32-character-secret-key
NEXTAUTH_SECRET=your-32-character-secret-key
```

---

## 📦 Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Production Build & Deployment

Build for production:

```bash
npm run build
npm run start
```

Deploying to Vercel requires setting `AUTH_SECRET`, `NEXTAUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` under Vercel Project Settings -> Environment Variables.

---

## 📄 License

MIT License — Privacy-first financial independence for everyone.
