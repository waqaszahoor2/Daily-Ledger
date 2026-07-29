'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Shield, Smartphone, BarChart3, Cloud, Lock, Zap, Wifi, WifiOff, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

const features = [
  { icon: Shield, title: 'Privacy First', desc: 'Your data stays yours. No company servers store your financial records.', color: 'bg-primary/10 text-primary' },
  { icon: BarChart3, title: 'Smart Reports', desc: 'Daily, weekly, monthly breakdowns with beautiful interactive charts.', color: 'bg-amber-500/10 text-amber-600' },
  { icon: Cloud, title: 'Google Drive Backup', desc: 'Encrypted backups to your own Google Drive for total data ownership.', color: 'bg-blue-500/10 text-blue-600' },
  { icon: Lock, title: 'AES-256 Encryption', desc: 'Bank-grade encryption protects every backup file you create.', color: 'bg-primary/10 text-primary' },
  { icon: Smartphone, title: 'Works Everywhere', desc: 'Responsive design works beautifully on desktop, tablet, and mobile.', color: 'bg-pink-500/10 text-pink-600' },
  { icon: WifiOff, title: 'Offline Ready', desc: 'IndexedDB keeps your data locally. No internet needed to operate.', color: 'bg-primary/10 text-primary' },
];

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">DailyLedger</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted hover:text-foreground transition-colors">Features</a>
            <a href="#privacy" className="text-sm text-muted hover:text-foreground transition-colors">Privacy</a>
            <a href="#about" className="text-sm text-muted hover:text-foreground transition-colors">About</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="btn-primary">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 rounded-xl hover:bg-surface-hover transition">
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenu && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden border-t border-border bg-background p-4 space-y-3">
            <a href="#features" className="block py-2 text-sm text-muted hover:text-foreground" onClick={() => setMobileMenu(false)}>Features</a>
            <a href="#privacy" className="block py-2 text-sm text-muted hover:text-foreground" onClick={() => setMobileMenu(false)}>Privacy</a>
            <Link href="/login" className="btn-primary w-full mt-3" onClick={() => setMobileMenu(false)}>
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden gradient-mesh">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" animate="visible" className="space-y-8">
              <motion.div variants={fadeUp} custom={0} className="flex items-center gap-3 flex-wrap">
                <span className="badge-offline"><WifiOff className="w-3.5 h-3.5" /> Offline Mode</span>
                <span className="badge-encrypted"><Lock className="w-3.5 h-3.5" /> Encrypted Local Storage</span>
              </motion.div>

              <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                Your Money.{' '}
                <span className="text-primary">Your Phone.</span>{' '}
                Your Drive.
              </motion.h1>

              <motion.p variants={fadeUp} custom={2} className="text-lg text-muted max-w-lg leading-relaxed">
                Track daily income, expenses, and personal lending with complete privacy.
                Your financial data never leaves your device — encrypted backups go to your own Google Drive.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-4">
                <Link href="/login" className="btn-primary text-base px-8 py-4">
                  Get Started — It&apos;s Free <ArrowRight className="w-5 h-5" />
                </Link>
                <a href="#features" className="btn-secondary text-base px-8 py-4">
                  Explore Features
                </a>
              </motion.div>

              <motion.div variants={fadeUp} custom={4} className="flex items-center gap-6 pt-4">
                {['100% Free', 'No Ads', 'No Tracking'].map((text) => (
                  <div key={text} className="flex items-center gap-2 text-sm text-muted">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    {text}
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Hero Card — Dashboard Preview matching reference */}
            <motion.div
              initial={{ opacity: 0, x: 50, rotate: 1 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:block"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/15 via-primary/5 to-amber-500/10 rounded-3xl blur-2xl" />
                <div className="relative glass-card overflow-hidden">
                  {/* Balance Card */}
                  <div className="gradient-balance p-6 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm opacity-80">Total Balance</p>
                      <div className="w-4 h-4 rounded-full border border-white/40 flex items-center justify-center text-[8px]">👁</div>
                    </div>
                    <p className="text-3xl font-bold tracking-tight">PKR 245,680.75</p>
                    <p className="text-xs opacity-70 mt-1">Across 4 Accounts</p>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Summary Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-primary/5 rounded-xl p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <ArrowRight className="w-3 h-3 text-primary rotate-[-45deg]" />
                          </div>
                          <span className="text-xs text-muted">Total Income</span>
                        </div>
                        <p className="text-lg font-bold text-primary">PKR 86,540</p>
                        <p className="text-xs text-primary/70">This Month ▲ 12%</p>
                      </div>
                      <div className="bg-danger/5 rounded-xl p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full bg-danger/10 flex items-center justify-center">
                            <ArrowRight className="w-3 h-3 text-danger rotate-[135deg]" />
                          </div>
                          <span className="text-xs text-muted">Total Expenses</span>
                        </div>
                        <p className="text-lg font-bold text-danger">PKR 58,260</p>
                        <p className="text-xs text-danger/70">This Month ▼ 8%</p>
                      </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="space-y-2">
                      {[
                        { icon: '🛒', name: 'Grocery Store', cat: 'Food & Groceries • Cash', amount: '-PKR 2,450', color: 'text-danger', time: 'Today, 9:30 AM' },
                        { icon: '💼', name: 'Salary', cat: 'Income • Bank Account', amount: '+PKR 45,000', color: 'text-primary', time: 'Yesterday, 8:15 AM' },
                        { icon: '☕', name: 'Coffee', cat: 'Food & Beverages • Cash', amount: '-PKR 320', color: 'text-danger', time: 'Oct 25, 10:20 AM' },
                      ].map((tx, i) => (
                        <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-surface-hover/50">
                          <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-base">{tx.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{tx.name}</p>
                            <p className="text-xs text-muted truncate">{tx.cat}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${tx.color}`}>{tx.amount}</p>
                            <p className="text-xs text-muted">{tx.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything You Need
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted text-lg max-w-2xl mx-auto">
              Simple, powerful tools to manage your personal finances without compromising your privacy.
            </motion.p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="glass-card p-6 group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-2xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section id="privacy" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={fadeUp} custom={0} className="space-y-6">
              <span className="badge-encrypted">
                <Lock className="w-3.5 h-3.5" /> Zero Knowledge Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
                Your Data Never Touches Our Servers
              </h2>
              <p className="text-muted leading-relaxed text-lg">
                DailyLedger stores all financial records locally in your browser using IndexedDB.
                When you backup, data is encrypted with AES-256-GCM before being saved to your own Google Drive.
              </p>
              <ul className="space-y-3">
                {[
                  'All data stored locally in your browser',
                  'AES-256-GCM encryption for all backups',
                  'Backups saved to YOUR Google Drive',
                  'No tracking, no analytics, no ads',
                  'You own and control everything',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-foreground">
                    <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} className="relative hidden lg:block">
              <div className="glass-card p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Shield className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Privacy Shield Active</h4>
                    <p className="text-xs text-muted">All systems operational</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Local Storage', status: 'IndexedDB Active' },
                    { label: 'Encryption', status: 'AES-256-GCM' },
                    { label: 'Server Data', status: 'None Stored' },
                    { label: 'Drive Backup', status: 'Your Account Only' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-surface-hover">
                      <span className="text-sm text-foreground">{item.label}</span>
                      <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-surface/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-6">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-bold text-foreground">
              Ready to Take Control?
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted text-lg max-w-xl mx-auto">
              Start tracking your finances today with complete privacy and zero cost.
            </motion.p>
            <motion.div variants={fadeUp} custom={2}>
              <Link href="/login" className="btn-primary text-base px-10 py-4">
                Get Started — Free Forever <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="border-t border-border py-12 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-foreground">DailyLedger</span>
            </div>
            <p className="text-sm text-muted">
              © {new Date().getFullYear()} DailyLedger. Your money. Your phone. Your Drive.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
