'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { admin, accessToken, refreshToken } = res.data;
      login(admin, accessToken, refreshToken);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e13] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#0F6E56] opacity-10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8 fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0F6E56] to-[#22c55e] mb-4 shadow-lg shadow-[#0F6E56]/30">
            <span className="text-white font-black text-2xl">7K</span>
          </div>
          <h1 className="text-3xl font-black text-white">7 Kaam</h1>
          <p className="text-[#6b7280] mt-1 text-sm">Certifying India&apos;s Skilled Workforce</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-xl font-bold text-white mb-6">Admin Sign In</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@7kaam.in"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#4b5563] focus:outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56] transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#4b5563] focus:outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56] transition-all"
              />
            </div>

            <button
              id="signin-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#0F6E56] hover:bg-[#1a9070] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-[#0F6E56]/30 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-4 text-xs text-center text-[#4b5563]">
            Demo: admin@7kaam.in / Admin@7kaam
          </p>
        </div>
      </div>
    </div>
  );
}
