'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';
import { IconCheck, IconXCircle, IconShield, IconAlertTriangle, IconClipboardList, IconWrench, IconSave, IconSettings, IconZap, IconMegaphone, IconPlusCircle, IconExternalLink } from '@/components/Icons';

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
      if (data.success) alert('設定已儲存！');
      else alert('儲存失敗: ' + data.error);
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
      alert('已清除可疑標記');
    }
  };

  if (loading) return (
    <div className="container" style={{ padding: '100px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
      驗證管理員身份中...
    </div>
  );

  if (unauthorized) return (
    <div className="container" style={{ padding: '100px 0', textAlign: 'center', maxWidth: '500px' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--accent-red)' }}><IconXCircle /> 權限不足</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
        要存取管理員面板，您需要先將 ValoLink Bot 邀請至您擁有管理員權限的 Discord 伺服器，並通過管理員驗證。
      </p>

      {/* Step 1: Invite Bot */}
      <div style={{
        background: 'rgba(122,162,247,0.06)', border: '1px solid rgba(122,162,247,0.2)',
        borderRadius: '10px', padding: '20px', marginBottom: '16px', textAlign: 'left',
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconPlusCircle /> 第一步：邀請機器人
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          點擊下方按鈕將 ValoLink Bot 邀請至您的 Discord 伺服器（需要管理員權限）。
        </p>
        <button
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={async () => {
            const res = await fetch('/api/auth/discord/invite');
            const data = await res.json();
            if (data.url) window.open(data.url, '_blank');
            else alert('Discord Client ID 未設定');
          }}
        >
          <IconExternalLink /> 邀請機器人至伺服器
        </button>
      </div>

      {/* Step 2: Verify Admin */}
      <div style={{
        background: 'rgba(158,206,106,0.06)', border: '1px solid rgba(158,206,106,0.2)',
        borderRadius: '10px', padding: '20px', marginBottom: '16px', textAlign: 'left',
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconShield /> 第二步：驗證管理員身份
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          透過 Discord 授權驗證您的管理員身份。我們只會檢查您擁有的伺服器列表，不會記錄任何個人資訊。
        </p>
        <a
          href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_CLIENT_ID || ''}&redirect_uri=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/api/admin/callback` : '')}&response_type=code&scope=identify%20guilds`}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', display: 'flex', textDecoration: 'none' }}
        >
          <IconShield /> 驗證管理員身份
        </a>
      </div>

      <Link href="/" className="btn-secondary" style={{ display: 'inline-flex', marginTop: '8px' }}>返回大廳</Link>
    </div>
  );

  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '80px' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '32px 0 8px' }}>
        <IconSettings /> 伺服器管理員面板
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        管理 ValoLink.gg 機器人設定、信用門檻與可疑用戶
      </p>

      {/* Bot invite button */}
      <div style={{ marginBottom: '24px' }}>
        <button
          className="btn-primary"
          onClick={async () => {
            const res = await fetch('/api/auth/discord/invite');
            const data = await res.json();
            if (data.url) window.open(data.url, '_blank');
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <IconPlusCircle /> 邀請機器人至伺服器
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>

        {/* Server Config Editor */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}><IconWrench /> 伺服器設定</h3>
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
                  <IconShield /> 最低信用門檻 (ValoScore)
                </label>
                <input className="input-field" type="number" min={0} max={100}
                  value={editConfig.minValoScore}
                  onChange={e => setEditConfig({ ...editConfig, minValoScore: Number(e.target.value) })} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  <IconMegaphone /> 揪團公告頻道 ID
                </label>
                <input className="input-field" value={editConfig.lobbyChannelId || ''}
                  placeholder="Discord Channel ID"
                  onChange={e => setEditConfig({ ...editConfig, lobbyChannelId: e.target.value || null })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="autoVoice" checked={editConfig.autoVoice}
                  onChange={e => setEditConfig({ ...editConfig, autoVoice: e.target.checked })} />
                <label htmlFor="autoVoice" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                  <IconZap /> 自動建立語音房
                </label>
              </div>
              <button className="btn-primary" onClick={handleSaveConfig} disabled={saving}>
                {saving ? '儲存中...' : <><IconSave /> 儲存設定</>}
              </button>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>尚未設定任何伺服器，請先使用 Bot 的 /config setup 指令</p>
          )}
        </div>

        {/* Suspicious Users */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}><IconAlertTriangle /> 疑似刷分用戶</h3>
            {suspiciousUsers.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>目前沒有被標記的可疑用戶 <IconCheck /></p>
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
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}><IconClipboardList /> 最近信用事件</h3>
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
