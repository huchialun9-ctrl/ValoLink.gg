'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

interface Config {
  guildId: string;
  minValoScore: number;
  autoVoice: boolean;
  lobbyChannelId: string | null;
  voiceCategoryId: string | null;
}

interface SuspiciousUser {
  id: string;
  riotId: string | null;
  valoScore: number;
}

interface RecentLog {
  id: string;
  userId: string;
  oldScore: number;
  newScore: number;
  reason: string | null;
  createdAt: string;
  user: { riotId: string | null };
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [suspiciousUsers, setSuspiciousUsers] = useState<SuspiciousUser[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [editConfig, setEditConfig] = useState<Config | null>(null);

  useEffect(() => {
    fetch('/api/admin')
      .then(r => {
        if (r.status === 403) { setUnauthorized(true); return null; }
        return r.json();
      })
      .then(data => {
        if (data) {
          setConfigs(data.configs);
          setSuspiciousUsers(data.suspiciousUsers);
          setRecentLogs(data.recentLogs);
          if (data.configs.length > 0) setEditConfig({ ...data.configs[0] });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSaveConfig = async () => {
    if (!editConfig) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_config', ...editConfig })
      });
      const data = await res.json();
      if (data.success) alert('✅ 設定已儲存！');
      else alert('❌ 儲存失敗: ' + data.error);
    } finally {
      setSaving(false);
    }
  };

  const handleClearSuspicious = async (userId: string) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear_suspicious', resetUserId: userId })
    });
    if ((await res.json()).success) {
      setSuspiciousUsers(prev => prev.filter(u => u.id !== userId));
      alert('✅ 已清除可疑標記');
    }
  };

  if (loading) return (
    <div className="container" style={{ padding: '100px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
      驗證管理員身份中...
    </div>
  );

  if (unauthorized) return (
    <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--accent-red)' }}>❌ 權限不足</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        您必須是 Discord 伺服器管理員才能存取此頁面
      </p>
      <Link href="/" className="btn-secondary">返回大廳</Link>
    </div>
  );

  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '80px' }}>
      <header className={styles.header}>
        <div className={styles.logo} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo.png" alt="ValoLink" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
          <Link href="/">VALOLINK<span className={styles.logoDot}>.GG</span></Link>
        </div>
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>組隊大廳</Link>
          <Link href="/leaderboard" className={styles.navLink}>信用排行榜</Link>
          <Link href="/dashboard" className={styles.navLink}>個人控制台</Link>
        </nav>
        <span style={{ background: 'rgba(255,70,85,0.15)', border: '1px solid rgba(255,70,85,0.4)', color: 'var(--accent-red)', padding: '4px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 }}>
          🛡️ 管理員面板
        </span>
      </header>

      <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '32px 0 8px' }}>
        ⚙️ 伺服器管理員面板
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        管理 ValoLink.gg 機器人設定、信用門檻與可疑用戶
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>

        {/* Server Config Editor */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>🔧 伺服器設定</h3>
          {editConfig ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Guild ID
                </label>
                <input className="input-field" value={editConfig.guildId} disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  🛡️ 最低信用門檻 (ValoScore)
                </label>
                <input className="input-field" type="number" min={0} max={100}
                  value={editConfig.minValoScore}
                  onChange={e => setEditConfig({ ...editConfig, minValoScore: Number(e.target.value) })} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  📢 揪團公告頻道 ID
                </label>
                <input className="input-field" value={editConfig.lobbyChannelId || ''}
                  placeholder="Discord Channel ID"
                  onChange={e => setEditConfig({ ...editConfig, lobbyChannelId: e.target.value || null })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="autoVoice" checked={editConfig.autoVoice}
                  onChange={e => setEditConfig({ ...editConfig, autoVoice: e.target.checked })} />
                <label htmlFor="autoVoice" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                  ⚡ 自動建立語音房
                </label>
              </div>
              <button className="btn-primary" onClick={handleSaveConfig} disabled={saving}>
                {saving ? '儲存中...' : '💾 儲存設定'}
              </button>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>尚未設定任何伺服器，請先使用 Bot 的 /config setup 指令</p>
          )}
        </div>

        {/* Suspicious Users */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>⚠️ 疑似刷分用戶</h3>
            {suspiciousUsers.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>目前沒有被標記的可疑用戶 ✅</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {suspiciousUsers.map(u => (
                  <div key={u.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'rgba(255,70,85,0.08)', border: '1px solid rgba(255,70,85,0.2)',
                    borderRadius: '6px', padding: '12px'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.riotId || u.id}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--accent-red)' }}>{u.valoScore} pts</div>
                    </div>
                    <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      onClick={() => handleClearSuspicious(u.id)}>
                      解除標記
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Reputation Logs */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>📋 最近信用事件</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
              {recentLogs.map(log => (
                <div key={log.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '0.82rem', padding: '8px', borderBottom: '1px solid var(--border-color)'
                }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{log.user.riotId || log.userId.slice(0, 8)}</span>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{log.reason}</span>
                  </div>
                  <span style={{ color: log.newScore >= log.oldScore ? '#4eff8a' : '#ff4655', fontWeight: 700 }}>
                    {log.oldScore} → {log.newScore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
