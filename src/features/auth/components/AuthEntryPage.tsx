'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/features/auth/services/authService';

type AuthMode = 'login' | 'register';

type AuthEntryPageProps = {
  mode: AuthMode;
};

type PasswordStrength = {
  score: number;
  label: 'Weak' | 'Medium' | 'Strong';
  barClass: string;
  textClass: string;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasDigit: boolean;
    hasSymbol: boolean;
  };
};

function getPasswordStrength(value: string): PasswordStrength {
  const checks = {
    minLength: value.length >= 8,
    hasUppercase: /[A-Z]/.test(value),
    hasLowercase: /[a-z]/.test(value),
    hasDigit: /\d/.test(value),
    hasSymbol: /[^A-Za-z0-9]/.test(value),
  };

  const score = Object.values(checks).filter(Boolean).length;

  if (score <= 2) {
    return {
      score,
      label: 'Weak',
      barClass: 'bg-red-500',
      textClass: 'text-red-600',
      checks,
    };
  }

  if (score <= 4) {
    return {
      score,
      label: 'Medium',
      barClass: 'bg-amber-500',
      textClass: 'text-amber-600',
      checks,
    };
  }

  return {
    score,
    label: 'Strong',
    barClass: 'bg-emerald-600',
    textClass: 'text-emerald-700',
    checks,
  };
}

export default function AuthEntryPage({ mode }: AuthEntryPageProps) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const shouldShowConfirmPassword =
    mode === 'register' && password.trim().length > 0;
  const isConfirmPasswordMismatch =
    shouldShowConfirmPassword && confirmPassword.length > 0
      ? password !== confirmPassword
      : false;

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password],
  );

  const infoText = useMemo(() => {
    if (error && error.toLowerCase().includes('pending approval')) {
      return error;
    }
    return null;
  }, [error]);

  const resetFeedback = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    resetFeedback();

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setError('Email format is invalid');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Password confirmation does not match');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        const result = await authService.register({
          name,
          email: normalizedEmail,
          password,
        });
        setSuccessMessage(result.message);
        setPassword('');
        setConfirmPassword('');
        return;
      }

      const result = await authService.login({
        email: normalizedEmail,
        password,
      });
      if (result.user.role === 'superadmin') {
        router.replace('/admin-panel');
        return;
      }
      router.replace('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className='relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-linear-to-b from-emerald-50 via-white to-teal-50'>
      <div className='pointer-events-none absolute -left-24 top-6 h-44 w-44 rounded-full bg-emerald-200/50 blur-2xl' />
      <div className='pointer-events-none absolute -right-20 bottom-6 h-52 w-52 rounded-full bg-teal-200/45 blur-2xl' />

      <div className='grid min-h-screen w-full bg-white/95 lg:min-h-180 lg:max-w-6xl lg:grid-cols-[1.15fr_1fr] lg:overflow-hidden lg:rounded-2xl'>
        <aside className='relative hidden flex-col justify-between gap-8 bg-linear-to-br from-emerald-700 via-emerald-600 to-teal-600 p-10 text-white lg:flex'>
          <div>
            <div className='inline-flex items-center rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm'>
              <span className='text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50'>
                Daily Finance Tracker
              </span>
            </div>

            <div className='mt-7 max-w-md'>
              <h1 className='text-3xl font-bold leading-tight sm:text-4xl'>
                Kelola keuangan harian tanpa ribet
              </h1>
              <p className='mt-4 text-sm leading-relaxed text-emerald-50/90 sm:text-base'>
                Planify membantu kamu mencatat arus kas, mengatur anggaran
                bulanan, dan memantau progres finansial dalam satu dashboard
                yang ringkas.
              </p>
            </div>
          </div>

          <div className='grid gap-3 text-sm text-emerald-50/95 sm:grid-cols-2'>
            <div className='rounded-xl bg-white/10 p-3'>
              Catat pemasukan dan pengeluaran setiap hari.
            </div>
            <div className='rounded-xl bg-white/10 p-3'>
              Pantau realisasi budget dengan laporan otomatis.
            </div>
          </div>
        </aside>

        <div className='mx-auto flex w-full max-w-md flex-col justify-center px-6 py-10 sm:px-8 lg:max-w-none lg:px-10'>
          <div className='mb-6 flex items-center justify-center lg:justify-start'>
            <Image
              src='/brand/planify-wordmark.svg'
              alt='Planify'
              width={150}
              height={34}
              className='h-7 w-auto'
            />
          </div>

          <h2 className='text-2xl font-semibold text-slate-900'>
            {mode === 'register'
              ? 'Create a new account'
              : 'Sign in to your account'}
          </h2>
          <p className='mt-2 text-sm text-slate-600'>
            {mode === 'register'
              ? 'Start building healthy financial habits with Planify.'
              : 'Continue your financial planning with always-synced data.'}
          </p>

          {successMessage && (
            <div className='mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800'>
              {successMessage}{' '}
              {mode === 'register' && (
                <Link href='/login' className='font-semibold underline'>
                  Continue to sign in
                </Link>
              )}
            </div>
          )}

          {infoText && (
            <div className='mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800'>
              {infoText}
            </div>
          )}

          {error && !infoText && (
            <div className='mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700'>
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className='mt-6 space-y-4'>
            {mode === 'register' && (
              <div>
                <label className='mb-1 block text-sm font-medium text-slate-700'>
                  Full name
                </label>
                <input
                  type='text'
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className='w-full rounded-lg bg-slate-100 px-3 py-2 outline-none focus:bg-emerald-50'
                  placeholder='Your full name'
                />
              </div>
            )}

            <div>
              <label className='mb-1 block text-sm font-medium text-slate-700'>
                Email
              </label>
              <input
                type='email'
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className='w-full rounded-lg bg-slate-100 px-3 py-2 outline-none focus:bg-emerald-50'
                placeholder='you@email.com'
              />
            </div>

            <div>
              <label className='mb-1 block text-sm font-medium text-slate-700'>
                Password
              </label>
              <div className='relative'>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={mode === 'register' ? 8 : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className='w-full rounded-lg bg-slate-100 px-3 py-2 pr-16 outline-none focus:bg-emerald-50'
                  placeholder={
                    mode === 'register' ? 'Minimum 8 characters' : '********'
                  }
                />
                <button
                  type='button'
                  onClick={() => setShowPassword((value) => !value)}
                  className='absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100'
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              {mode === 'register' && password.length > 0 && (
                <div className='mt-2'>
                  <div className='mb-1 flex items-center justify-between text-xs'>
                    <span className='text-slate-500'>Password strength</span>
                    <span className={passwordStrength.textClass}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className='h-1.5 w-full overflow-hidden rounded-full bg-slate-200'>
                    <div
                      className={`h-full ${passwordStrength.barClass} transition-all duration-200`}
                      style={{
                        width: `${(passwordStrength.score / 5) * 100}%`,
                      }}
                    />
                  </div>
                  <p className='mt-1 text-xs text-slate-500'>
                    Use at least 8 characters with uppercase, lowercase, number,
                    and symbol.
                  </p>
                </div>
              )}
            </div>

            {shouldShowConfirmPassword && (
              <div>
                <label className='mb-1 block text-sm font-medium text-slate-700'>
                  Confirm password
                </label>
                <div className='relative'>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className='w-full rounded-lg bg-slate-100 px-3 py-2 pr-16 outline-none focus:bg-emerald-50'
                    placeholder='Re-enter your password'
                  />
                  <button
                    type='button'
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className='absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100'
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {isConfirmPasswordMismatch && (
                  <p className='mt-1 text-xs text-red-600'>
                    Password confirmation does not match
                  </p>
                )}
              </div>
            )}

            <button
              type='submit'
              disabled={loading || isConfirmPasswordMismatch}
              className='w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60'
            >
              {loading
                ? 'Processing...'
                : mode === 'register'
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          <p className='mt-5 text-center text-sm text-slate-600'>
            {mode === 'register'
              ? 'Already have an account?'
              : "Don't have an account yet?"}{' '}
            <Link
              href={mode === 'register' ? '/login' : '/register'}
              className='font-semibold text-emerald-700 hover:text-emerald-800'
            >
              {mode === 'register' ? 'Sign in here' : 'Register now'}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
