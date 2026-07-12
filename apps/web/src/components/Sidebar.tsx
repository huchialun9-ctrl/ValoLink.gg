'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { IconGlobe, IconTrophy, IconUsers, IconShield, IconSettings, IconUser } from '@/components/Icons';

const navItems = [
  { href: '/', label: '組隊大廳', icon: <IconGlobe /> },
  { href: '/leaderboard', label: '信用排行榜', icon: <IconTrophy /> },
  { href: '/dashboard', label: '個人控制台', icon: <IconUsers /> },
  { href: '/admin', label: '管理員面板', icon: <IconShield /> },
];

export default function Sidebar() {
  const { session } = useAuth();
  const pathname = usePathname();

  if (pathname.startsWith('/auth')) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/logo.png" alt="ValoLink" style={{ width: '22px', height: '22px', borderRadius: '4px' }} />
        <Link href="/">VALOLINK<span className="sidebar-logoDot">.GG</span></Link>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? 'sidebar-linkActive' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {session ? (
          <>
            <Link href="/settings" className={`sidebar-link ${pathname === '/settings' ? 'sidebar-linkActive' : ''}`}>
              <IconSettings /> 設定
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px' }}>
              <img
                src={session.avatar}
                alt={session.username}
                style={{ width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer' }}
                onClick={() => window.location.href = `/player/${session.id}`}
              />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session.username}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  ValoScore: {session.valoScore}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <a href="/auth" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '8px' }}>
              註冊 / 登入
            </a>
            <a href="/api/auth/login" className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '8px' }}>
              Discord 登入
            </a>
          </>
        )}
      </div>
    </aside>
  );
}
