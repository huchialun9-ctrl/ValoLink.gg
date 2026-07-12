'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import styles from '@/app/page.module.css';

const navItems = [
  { href: '/', label: '組隊大廳 (Lobby)' },
  { href: '/leaderboard', label: '信用排行榜 (ValoScore)' },
  { href: '/dashboard', label: '個人控制台 (Dashboard)' },
];

interface NavHeaderProps {
  badge?: string;
  hideAuth?: boolean;
}

export default function NavHeader({ badge, hideAuth }: NavHeaderProps) {
  const { session } = useAuth();
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <img src="/logo.png" alt="ValoLink Logo" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
        <Link href="/">VALOLINK<span className={styles.logoDot}>.GG</span></Link>
      </div>
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navLink} ${pathname === item.href ? styles.navActive : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {badge && (
          <span className={styles.modeBadge}>{badge}</span>
        )}
        {!hideAuth && (
          session ? (
            <>
              <Link href="/dashboard" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                主控台
              </Link>
              <img
                src={session.avatar}
                alt={session.username}
                style={{ width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer' }}
                onClick={() => window.location.href = `/player/${session.id}`}
              />
            </>
          ) : (
            <a href="/api/auth/login" className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>
              登入 / LOGIN
            </a>
          )
        )}
      </div>
    </header>
  );
}
