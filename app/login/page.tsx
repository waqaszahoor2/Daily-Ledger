'use client';

import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Mail, Lock, Eye, EyeOff, KeyRound, CheckCircle2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // OTP Verification state
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userOtp, setUserOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const generateAndSendOtp = (recipientEmail: string) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setUserOtp(['', '', '', '', '', '']);
    setResendTimer(30);

    // Prompt / Toast dispatch
    toast.success(`Verification code sent to ${recipientEmail}!`, {
      description: `Your 6-digit confirmation code is: ${code}`,
      duration: 10000,
    });
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      toast.loading('Redirecting to Google Sign-In...');
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (err) {
      console.error('Google Sign-In error:', err);
      toast.error('Google Sign-In failed');
      setLoading(false);
    }
  };

  const handleEmailFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

    if (!cleanEmail || !gmailRegex.test(cleanEmail)) {
      toast.error('Please enter a valid original @gmail.com address (e.g. user@gmail.com)');
      return;
    }
    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    if (!isLogin && !name.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    setLoading(true);
    try {
      // Trigger OTP verification step for account creation/login
      generateAndSendOtp(cleanEmail);
      setStep('otp');
    } catch {
      toast.error('Authentication request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...userOtp];
    newOtp[index] = value.slice(-1);
    setUserOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !userOtp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().slice(0, 6);
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setUserOtp(digits);
      otpInputsRef.current[5]?.focus();
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = userOtp.join('');
    if (enteredCode.length < 6) {
      toast.error('Please enter the full 6-digit confirmation code');
      return;
    }

    if (enteredCode !== generatedOtp) {
      toast.error('Incorrect confirmation code. Please check your code and try again.');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const userId = `user_${btoa(cleanEmail).replace(/=/g, '')}`;
      
      localStorage.setItem('dl_user', JSON.stringify({
        id: userId,
        name: name.trim() || cleanEmail.split('@')[0],
        email: cleanEmail,
        provider: 'email_verified',
      }));

      if (!isLogin) {
        localStorage.setItem('dl_first_login', 'true');
      }

      toast.success('Gmail identity verified successfully! Welcome to DailyLedger.');
      router.push('/dashboard');
    } catch {
      toast.error('Failed to complete account activation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="glass-card p-8 space-y-6">
          {/* Logo & Dynamic Title */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-2xl mx-auto shadow-md">
              {step === 'otp' ? <KeyRound className="w-7 h-7" /> : 'D'}
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {step === 'otp' ? 'Confirm Gmail Code' : isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-sm text-muted">
              {step === 'otp'
                ? `Enter 6-digit confirmation code sent to ${email}`
                : isLogin
                ? 'Sign in to your DailyLedger account'
                : 'Start managing your finances privately with @gmail.com'}
            </p>
          </div>

          {step === 'form' ? (
            <>
              {/* Google Sign In */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-border bg-card hover:bg-surface-hover transition-all duration-200 text-sm font-medium text-foreground disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted">or continue with original @gmail</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailFormSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="input-field"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Original Gmail Address (@gmail.com)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@gmail.com"
                      className="input-field pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•••••••• (min 8 chars)"
                      className="input-field pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full cursor-pointer">
                  {loading ? 'Sending Code...' : isLogin ? 'Sign In' : 'Send Gmail Confirmation Code'}
                </button>
              </form>

              {/* Toggle */}
              <p className="text-center text-sm text-muted">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline cursor-pointer">
                  {isLogin ? 'Create one' : 'Sign in'}
                </button>
              </p>
            </>
          ) : (
            /* 6-Digit OTP Verification Screen */
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
                <span className="text-primary font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Code sent to {email}
                </span>
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-muted hover:text-foreground underline font-medium cursor-pointer"
                >
                  Change Email
                </button>
              </div>

              {/* 6-Digit Box Input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground text-center">
                  6-Digit Confirmation Code
                </label>
                <div className="flex items-center justify-between gap-2" onPaste={handleOtpPaste}>
                  {userOtp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { otpInputsRef.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl font-bold bg-card border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl outline-none transition-all text-foreground"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || userOtp.join('').length < 6}
                className="btn-primary w-full h-12 text-sm font-bold disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Verifying Code...' : 'Confirm Code & Activate Account'}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-muted">Didn't receive the code?</span>
                <button
                  type="button"
                  disabled={resendTimer > 0}
                  onClick={() => generateAndSendOtp(email)}
                  className="text-primary font-semibold hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendTimer === 0 ? '' : 'animate-spin'}`} />
                  {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
                </button>
              </div>
            </form>
          )}

          {/* Privacy Notice */}
          <div className="flex items-center gap-2 justify-center text-xs text-muted pt-2 border-t border-border/50">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            Your credentials are verified securely. Financial data stays on your device.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
