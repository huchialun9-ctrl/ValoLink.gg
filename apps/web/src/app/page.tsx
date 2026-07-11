'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';

interface Lobby {
  id: string;
  mode: string;
  minRank: string;
  description: string;
  captainName: string;
  captainAvatar: string;
  valoScore: number;
  currentCount: number;
  maxCount: number;
}

export default function Home() {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [filterMode, setFilterMode] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [showForm, setShowForm] = useState(false);
  const [formRiotId, setFormRiotId] = useState('');
  const [formDiscordId, setFormDiscordId] = useState('');
  const [formGameMode, setFormGameMode] = useState('Competitive');
  const [formMinRank, setFormMinRank] = useState('Diamond');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch real-time active lobbies from the database via API endpoint
  const fetchLobbies = async () => {
    try {
      const res = await fetch('/api/lobbies');
      if (!res.ok) {
        throw new Error('Failed to retrieve lobbies from server');
      }
      const data = await res.json();
      setLobbies(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('無法載入即時隊伍，請重新整理網頁。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLobbies();
    // Poll active lobbies every 5 seconds for interactive, dynamic feel
    const interval = setInterval(fetchLobbies, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRiotId.includes('#')) {
      alert('Riot ID 格式必須包含 # (例如: TenZ#NA1)');
      return;
    }
    if (!formDiscordId) {
      alert('請輸入 Discord ID');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/lobbies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captainName: formRiotId,
          discordId: formDiscordId,
          gameMode: formGameMode,
          minRank: formMinRank,
          description: formDesc,
        }),
      });

      if (res.ok) {
        setFormRiotId('');
        setFormDiscordId('');
        setFormDesc('');
        setShowForm(false);
        fetchLobbies();
      } else {
        alert('建立房間失敗，請確認資料填寫正確。');
      }
    } catch (err) {
      console.error(err);
      alert('連線失敗，請稍後重試。');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLobbies = filterMode === 'All' 
    ? lobbies 
    : lobbies.filter(l => l.mode === filterMode);

  return (
    <div className="container">
      {/* Premium Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          VALOLINK<span className={styles.logoDot}>.GG</span>
        </div>
        <nav className={styles.nav}>
          <a href="#" className={`${styles.navLink} ${styles.navActive}`}>組隊大廳 (Lobby)</a>
          <a href="/leaderboard" className={styles.navLink}>信用排行榜 (ValoScore)</a>
          <a href="/dashboard" className={styles.navLink}>個人控制台 (Dashboard)</a>
        </nav>
        <button className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>
          登入 / LOGIN
        </button>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Find Your Perfect <span className={styles.heroHighlight}>Squad</span>
        </h1>
        <p className={styles.heroSubtitle}>
          特戰英豪跨伺服器智慧組隊平台。透過真實戰績驗證與跨群信用評分，一鍵媒合神隊友，告別毒瘤與隨機配對惡夢。
        </p>
        <div className={styles.heroButtons}>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '關閉建立面板' : '🌐 網頁直接開房間'}
          </button>
          <button className="btn-secondary" onClick={fetchLobbies}>重新整理大廳</button>
        </div>
      </section>

      {/* Interactive Form Panel */}
      {showForm && (
        <div className="glass-card" style={{ marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 600 }}>建立您的戰術隊伍</h3>
          <form onSubmit={handleCreateLobby}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Riot ID (含 #)</label>
                <input
                  type="text"
                  placeholder="TenZ#NA1"
                  value={formRiotId}
                  onChange={(e) => setFormRiotId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Discord 使用者 ID</label>
                <input
                  type="text"
                  placeholder="23456789012345"
                  value={formDiscordId}
                  onChange={(e) => setFormDiscordId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>遊戲模式</label>
                <select
                  value={formGameMode}
                  onChange={(e) => setFormGameMode(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none' }}
                >
                  <option value="Competitive">競技模式 (Competitive)</option>
                  <option value="Unrated">一般模式 (Unrated)</option>
                  <option value="Swiftplay">超急速衝鋒 (Swiftplay)</option>
                  <option value="Premier">首要對決 (Premier)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>最低牌位限制</label>
                <select
                  value={formMinRank}
                  onChange={(e) => setFormMinRank(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none' }}
                >
                  <option value="Iron">鐵牌 (Iron)</option>
                  <option value="Bronze">銅牌 (Bronze)</option>
                  <option value="Silver">銀牌 (Silver)</option>
                  <option value="Gold">金牌 (Gold)</option>
                  <option value="Platinum">白金 (Platinum)</option>
                  <option value="Diamond">鑽石 (Diamond)</option>
                  <option value="Ascendant">超凡入聖 (Ascendant)</option>
                  <option value="Immortal">神話 (Immortal)</option>
                  <option value="Radiant">輻能戰士 (Radiant)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>隊伍備註</label>
              <textarea
                placeholder="例如: 缺控場/開麥/歡樂打"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '4px', minHeight: '60px', resize: 'vertical', outline: 'none' }}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitting}>
              {submitting ? '建立中...' : '確認建立房間'}
            </button>
          </form>
        </div>
      )}

      {/* Matchmaking Lobby Section */}
      <section className={styles.lobbySection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>活躍揪團中 (Active Squads)</h2>
          <div className={styles.filters}>
            {['All', 'Competitive', 'Swiftplay', 'Premier'].map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`${styles.filterBtn} ${filterMode === mode ? styles.filterBtnActive : ''}`}
              >
                {mode === 'All' ? '全部模式' : mode}
              </button>
            ))}
          </div>
        </div>

        {/* Loading and Error States */}
        {loading && lobbies.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            正在同步 Riot 與 Discord 組隊大廳資料中...
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--primary-red)' }}>
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredLobbies.length === 0 && (
          <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h3 style={{ marginBottom: '12px', color: 'var(--primary-blue)', fontSize: '1.3rem', fontWeight: 600 }}>
              ⚠️ 目前沒有活躍的揪團隊伍
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 24px', fontSize: '0.95rem' }}>
              現在大廳內空空如也。請點擊上方按鈕在網頁直接發起隊伍，或使用 Discord 機器人在您的伺服器輸入 <strong>/create</strong> 快速建立第一個戰術組隊！
            </p>
          </div>
        )}

        {/* Squad Cards Grid */}
        {filteredLobbies.length > 0 && (
          <div className={styles.grid}>
            {filteredLobbies.map((lobby) => (
              <div key={lobby.id} className="glass-card">
                <div className={styles.cardHeader}>
                  <span className={styles.modeBadge}>{lobby.mode}</span>
                  <span className={styles.rankLimit}>🏆 {lobby.minRank} +</span>
                </div>
                <p className={styles.cardDesc}>{lobby.description}</p>
                <div className={styles.cardFooter}>
                  <div className={styles.captainInfo}>
                    <div className={styles.avatarMock}>{lobby.captainAvatar}</div>
                    <div>
                      <div className={styles.captainName}>{lobby.captainName}</div>
                      <div className={styles.captainScore}>信用分: {lobby.valoScore}</div>
                    </div>
                  </div>
                  <div className={styles.memberCount}>
                    人數: <span className={styles.memberCountActive}>{lobby.currentCount}</span> / {lobby.maxCount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
