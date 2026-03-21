'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError('Invalid email or password');
    } else {
      router.push('/');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">AI Bookmark Saver</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
        </div>

        {/* Google OAuth */}
        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded-lg py-2.5 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Email / password */}
        <form onSubmit={handleCredentials} className="space-y-4">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm transition"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
