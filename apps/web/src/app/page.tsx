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

  // Fetch real-time active lobbies from the database via API endpoint
  const fetchLobbies = async () => {
    try {
      setLoading(true);
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
          <a href="#" className={styles.navLink}>信用排行榜 (ValoScore)</a>
          <a href="#" className={styles.navLink}>個人控制台 (Dashboard)</a>
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
          <button className="btn-primary">邀請 Discord Bot</button>
          <button className="btn-secondary" onClick={fetchLobbies}>重新整理大廳</button>
        </div>
      </section>

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
            <h3 style={{ marginBottom: '12px', color: 'var(--primary-red)', fontFamily: 'var(--font-accent)', fontSize: '1.5rem' }}>
              ⚠️ 目前沒有活躍的揪團隊伍
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 24px', fontSize: '0.95rem' }}>
              現在大廳內空空如也。請點擊上方按鈕邀請 ValoLink.gg Discord 機器人到您的伺服器，並使用 <strong>/create</strong> 快速發起第一個戰術組隊！
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
