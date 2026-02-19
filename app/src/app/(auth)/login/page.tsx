'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/services/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'success') {
      setSuccess('Senha alterada com sucesso! Faça login com a nova senha.');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('Email ou senha incorretos');
      setLoading(false);
      return;
    }

    window.location.href = '/';
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Digite seu email');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError('Erro ao enviar email de recuperacao. Tente novamente.');
      setLoading(false);
      return;
    }

    setSuccess('Link de recuperacao enviado! Verifique seu email.');
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-600 text-lg font-bold text-white">
            A
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">ADM PRO</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {forgotMode ? 'Recuperar senha' : 'Entre na sua conta'}
          </p>
        </div>

        {forgotMode ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/30 dark:text-green-400">
                {success}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoCapitalize="off"
                autoCorrect="off"
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm normal-case focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                placeholder="seu@email.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent-600 py-2.5 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperacao'}
            </button>
            <button
              type="button"
              onClick={() => { setForgotMode(false); setError(''); setSuccess(''); }}
              className="w-full text-sm font-medium text-accent-600 hover:text-accent-700"
            >
              Voltar ao login
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoCapitalize="off"
                autoCorrect="off"
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm normal-case focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Senha</label>
                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setError(''); }}
                  className="text-xs font-medium text-accent-600 hover:text-accent-700"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoCapitalize="off"
                autoCorrect="off"
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm normal-case focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent-600 py-2.5 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Não tem conta?{' '}
          <Link href="/register" className="font-medium text-accent-600 hover:text-accent-700">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
