'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

// Mock list of user's managed Discord servers
const MOCK_GUILDS = [
  { id: '1525378957694730300', name: '特戰英豪台灣官方社群' },
  { id: '987654321098765432', name: 'Valorant Team TW' },
];

export default function Dashboard() {
  const [selectedGuild, setSelectedGuild] = useState(MOCK_GUILDS[0].id);
  const [lobbyChannel, setLobbyChannel] = useState('');
  const [voiceCategory, setVoiceCategory] = useState('');
  const [autoVoice, setAutoVoice] = useState(true);
  const [minScore, setMinScore] = useState(50);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch server configuration when active guild selection changes
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/config?guildId=${selectedGuild}`);
        if (res.ok) {
          const data = await res.json();
          setLobbyChannel(data.lobbyChannelId || '');
          setVoiceCategory(data.voiceCategoryId || '');
          setAutoVoice(data.autoVoice ?? true);
          setMinScore(data.minValoScore ?? 50);
        }
      } catch (err) {
        console.error('Failed to load server config:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchConfig();
  }, [selectedGuild]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: selectedGuild,
          lobbyChannelId: lobbyChannel,
          voiceCategoryId: voiceCategory,
          autoVoice,
          minValoScore: minScore,
        }),
      });

      if (res.ok) {
        setMessage({ text: '設定已成功儲存並同步至 Discord Bot！✅', type: 'success' });
      } else {
        throw new Error('Server responded with an error');
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: '儲存失敗，請確認資料庫狀態與網路連線。❌', type: 'error' });
    }
  };

  return (
    <div className="container">
      {/* Premium Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <Link href="/">VALOLINK<span className={styles.logoDot}>.GG</span></Link>
        </div>
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>組隊大廳 (Lobby)</Link>
          <Link href="/leaderboard" className={styles.navLink}>信用排行榜 (ValoScore)</Link>
          <Link href="/dashboard" className={`${styles.navLink} ${styles.navActive}`}>個人控制台 (Dashboard)</Link>
        </nav>
        <button className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>
          管理員
        </button>
      </header>

      {/* Hero Header */}
      <section className={styles.hero} style={{ padding: '60px 0 30px' }}>
        <h1 className={styles.heroTitle} style={{ fontSize: '3rem' }}>
          Server <span className={styles.heroHighlight}>控制台</span>
        </h1>
        <p className={styles.heroSubtitle}>
          設定與管理您伺服器中的 ValoLink.gg 機器人行為，活化語音頻道並開啟安全聯網防禦。
        </p>
      </section>

      {/* Dashboard Panels */}
      <section style={{ maxWidth: '800px', margin: '0 auto 80px' }}>
        <div className="glass-card" style={{ padding: '40px' }}>
          
          {/* Guild Selector */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.9rem', textTransform: 'uppercase' }}>
              選擇要管理的 Discord 伺服器
            </label>
            <select
              value={selectedGuild}
              onChange={(e) => setSelectedGuild(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 70, 85, 0.2)',
                color: '#fff',
                padding: '12px 16px',
                borderRadius: '4px',
                fontSize: '1rem',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-primary)'
              }}
            >
              {MOCK_GUILDS.map((g) => (
                <option key={g.id} value={g.id} style={{ background: '#0f1923' }}>
                  {g.name} ({g.id})
                </option>
              ))}
            </select>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '32px' }} />

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
              正在載入伺服器配置設定...
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              
              {/* Option 1: Lobby Channel ID */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  📢 揪團公告頻道 ID (Lobby Channel ID)
                </label>
                <input
                  type="text"
                  placeholder="例如: 123456789012345678"
                  value={lobbyChannel}
                  onChange={(e) => setLobbyChannel(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '12px 16px',
                    borderRadius: '4px',
                    color: '#fff',
                    outline: 'none',
                    fontFamily: 'var(--font-primary)'
                  }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                  設定 Bot 允許發起並顯示字卡的大廳頻道。
                </span>
              </div>

              {/* Option 2: Voice Category ID */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  🔊 語音分區類別 ID (Voice Category ID)
                </label>
                <input
                  type="text"
                  placeholder="例如: 987654321098765432"
                  value={voiceCategory}
                  onChange={(e) => setVoiceCategory(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '12px 16px',
                    borderRadius: '4px',
                    color: '#fff',
                    outline: 'none',
                    fontFamily: 'var(--font-primary)'
                  }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                  動態產生的語音頻道將在此類別目錄下建立。
                </span>
              </div>

              {/* Option 3: Min ValoScore */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  🛡️ 准入信用分低標限制 (Min ValoScore)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--primary-red)' }}
                  />
                  <span style={{ width: '60px', textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                    {minScore} pts
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                  信用積分低於此數值的玩家，將無法使用此伺服器內的任何組隊功能。
                </span>
              </div>

              {/* Option 4: Auto Voice Switch */}
              <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>
                    ⚡ 自動化語音控制模組
                  </label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    滿人或隊長按下開打時，自動在 Discord 中建立專屬臨時語音房。
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoVoice}
                  onChange={(e) => setAutoVoice(e.target.checked)}
                  style={{
                    width: '40px',
                    height: '20px',
                    accentColor: 'var(--primary-red)',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Message Notification */}
              {message && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '4px',
                  marginBottom: '24px',
                  fontSize: '0.9rem',
                  background: message.type === 'success' ? 'rgba(78, 255, 138, 0.1)' : 'rgba(255, 70, 85, 0.1)',
                  border: `1px solid ${message.type === 'success' ? '#4eff8a' : '#ff4655'}`,
                  color: message.type === 'success' ? '#4eff8a' : '#ff4655'
                }}>
                  {message.text}
                </div>
              )}

              {/* Submit button */}
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                儲存設定 (Save Config)
              </button>

            </form>
          )}

        </div>
      </section>
    </div>
  );
}
