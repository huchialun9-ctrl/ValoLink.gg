'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { IconUser, IconMail, IconShield, IconSave, IconGamepad2, IconAlertTriangle, IconKey, IconMessageCircle } from '@/components/Icons';
import AvatarUpload from '@/components/AvatarUpload';

export default function SettingsPage() {
  const { session, loading, updateSession } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [riotId, setRiotId] = useState('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (session) {
      setDisplayName(session.username || '');
      setEmail((session as any).email || '');
      setRiotId(session.riotId || '');
      setBio((session as any).bio || '');
    }
  }, [session]);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, bio, riotId }),
      });
      const data = await res.json();
      if (res.ok) {
        updateSession({ username: displayName, riotId });
        showMsg('個人資料已更新', 'success');
      } else {
        showMsg(data.error || '更新失敗', 'error');
      }
    } catch {
      showMsg('連線失敗', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword.length < 6) {
      showMsg('新密碼至少需要 6 個字元', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPassword('');
        setNewPassword('');
        showMsg('密碼已更新', 'success');
      } else {
        showMsg(data.error || '密碼更新失敗', 'error');
      }
    } catch {
      showMsg('連線失敗', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLinkRiotId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riotId.includes('#')) {
      showMsg('Riot ID 格式必須包含 #', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/user/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session?.id, riotId }),
      });
      const data = await res.json();
      if (res.ok) {
        updateSession({ riotId: data.riotId, rank: data.rank });
        showMsg('Riot ID 綁定成功', 'success');
      } else {
        showMsg(data.error || '綁定失敗', 'error');
      }
    } catch {
      showMsg('連線失敗', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '100px', color: 'var(--text-secondary)' }}>
        載入中...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <h2 style={{ marginBottom: '12px' }}>請先登入</h2>
        <a href="/auth" className="btn-primary">前往登入</a>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '640px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>
        <IconUser /> 帳號設定
      </h1>

      {message && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '16px',
          fontSize: '0.85rem',
          background: messageType === 'success' ? 'rgba(158,206,106,0.1)' : 'rgba(247,118,142,0.1)',
          border: `1px solid ${messageType === 'success' ? 'rgba(158,206,106,0.3)' : 'rgba(247,118,142,0.3)'}`,
          color: messageType === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <form onSubmit={handleSaveProfile} className="glass-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconUser /> 個人資料
          </h3>
          <AvatarUpload
            currentAvatar={session.avatar}
            displayName={displayName}
            onAvatarChange={(url) => updateSession({ avatar: url || undefined })}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>顯示名稱</label>
              <input className="input-field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>個人簡介</label>
              <textarea className="input-field" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="介紹一下你自己..." rows={3} />
            </div>
            <button type="submit" className="btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
              <IconSave /> 儲存個人資料
            </button>
          </div>
        </form>

        <form onSubmit={handleLinkRiotId} className="glass-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconGamepad2 /> Riot ID 綁定
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Riot ID（含 #）</label>
              <input className="input-field" value={riotId} onChange={(e) => setRiotId(e.target.value)} placeholder="TenZ#NA1" />
            </div>
            <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '6px 14px' }}>
              綁定
            </button>
          </div>
          {session.rank && (
            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              目前牌位: <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{session.rank}</span>
            </div>
          )}
        </form>

        <form onSubmit={handleChangePassword} className="glass-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconKey /> 變更密碼
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>目前密碼</label>
              <input className="input-field" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="輸入目前密碼" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>新密碼</label>
              <input className="input-field" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="至少 6 個字元" minLength={6} />
            </div>
            <button type="submit" className="btn-primary" disabled={saving || !currentPassword || !newPassword} style={{ alignSelf: 'flex-start' }}>
              <IconKey /> 更新密碼
            </button>
          </div>
        </form>

        <div className="glass-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconShield /> 帳號資訊
          </h3>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div><IconMail /> Email: {(session as any).email || '未設定'}</div>
            <div><IconUser /> Discord 名稱: {session.username}</div>
            <div><IconShield /> ValoScore: {session.valoScore} pts</div>
          </div>
        </div>
      </div>
    </div>
  );
}
