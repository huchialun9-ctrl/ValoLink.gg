'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { IconMessageCircle, IconGlobe } from '@/components/Icons';

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body: any = { email, password };
      if (tab === 'register') body.username = username;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        window.location.href = '/';
      } else {
        setError(data.error || '操作失敗');
      }
    } catch {
      setError('連線失敗，請稍後重試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '420px', marginTop: '60px' }}>
      <div className="glass-card" style={{ padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>
            VALOLINK<span style={{ color: 'var(--accent-blue)' }}>.GG</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {tab === 'login' ? '登入你的帳號' : '建立新帳號'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-secondary)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
          <button
            onClick={() => setTab('login')}
            style={{
              flex: 1, padding: '8px', border: 'none', borderRadius: '4px',
              background: tab === 'login' ? 'var(--bg-inset)' : 'transparent',
              color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem'
            }}
          >
            登入
          </button>
          <button
            onClick={() => setTab('register')}
            style={{
              flex: 1, padding: '8px', border: 'none', borderRadius: '4px',
              background: tab === 'register' ? 'var(--bg-inset)' : 'transparent',
              color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem'
            }}
          >
            註冊
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {tab === 'register' && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>使用者名稱</label>
              <input className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="YourName" required />
            </div>
          )}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Email</label>
            <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>密碼</label>
            <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 個字元" required minLength={6} />
          </div>

          {error && (
            <div style={{ padding: '10px', fontSize: '0.85rem', color: 'var(--accent-red)', background: 'rgba(247,118,142,0.1)', borderRadius: 'var(--radius-sm)' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} disabled={loading}>
            {loading ? '處理中...' : (tab === 'login' ? '登入' : '註冊')}
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center', borderTop: '1px solid var(--border-muted)', paddingTop: '16px' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>或使用 Discord 快速登入</p>
          <a href="/api/auth/login" className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
            <IconMessageCircle /> Discord 登入
          </a>
        </div>
      </div>
    </div>
  );
}
