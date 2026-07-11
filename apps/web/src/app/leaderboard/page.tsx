'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

interface LeaderboardUser {
  rank: number;
  id: string;
  riotId: string;
  gameRank: string;
  valoScore: number;
  joinedAt: string;
}

export default function Leaderboard() {
  const [players, setPlayers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const filteredPlayers = players.filter(p => 
    p.riotId.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.id.includes(searchQuery)
  );

  return (
    <div className="container">
      {/* Premium Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <Link href="/">VALOLINK<span className={styles.logoDot}>.GG</span></Link>
        </div>
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>組隊大廳 (Lobby)</Link>
          <Link href="/leaderboard" className={`${styles.navLink} ${styles.navActive}`}>信用排行榜 (ValoScore)</Link>
          <Link href="/dashboard" className={styles.navLink}>個人控制台 (Dashboard)</Link>
        </nav>
        <button className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>
          登入 / LOGIN
        </button>
      </header>

      {/* Hero Header */}
      <section className={styles.hero} style={{ padding: '60px 0 30px' }}>
        <h1 className={styles.heroTitle} style={{ fontSize: '3rem' }}>
          ValoScore <span className={styles.heroHighlight}>信用排行榜</span>
        </h1>
        <p className={styles.heroSubtitle}>
          基於賽後匿名互評機制的信用積分系統。系統將優先保護高信用分玩家，杜絕惡意擺爛與言語暴力。
        </p>
      </section>

      {/* Leaderboard Table Section */}
      <section style={{ paddingBottom: '80px' }}>
        <div className={styles.sectionHeader} style={{ flexWrap: 'wrap', gap: '16px' }}>
          <h2 className={styles.sectionTitle}>頂尖信用玩家</h2>
          <div>
            <input
              type="text"
              placeholder="搜尋 Riot ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '10px 20px',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '0.95rem',
                outline: 'none',
                width: '260px',
                fontFamily: 'var(--font-primary)'
              }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            載入排行榜中...
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
            沒有找到相符的信用玩家紀錄。
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255, 70, 85, 0.2)', color: 'var(--text-secondary)', fontFamily: 'var(--font-accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <th style={{ padding: '16px 24px' }}>排名</th>
                  <th style={{ padding: '16px 24px' }}>玩家 Riot ID</th>
                  <th style={{ padding: '16px 24px' }}>Discord ID</th>
                  <th style={{ padding: '16px 24px' }}>遊戲牌位</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right' }}>ValoScore 信用值</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => (
                  <tr 
                    key={player.id} 
                    style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 70, 85, 0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '20px 24px', fontWeight: 'bold', color: player.rank <= 3 ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      #{player.rank}
                    </td>
                    <td style={{ padding: '20px 24px', fontWeight: '600' }}>
                      {player.riotId}
                    </td>
                    <td style={{ padding: '20px 24px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {player.id}
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{
                        background: 'rgba(0, 240, 255, 0.1)',
                        border: '1px solid var(--accent-cyan)',
                        color: 'var(--accent-cyan)',
                        padding: '4px 10px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        borderRadius: '2px'
                      } as React.CSSProperties}>
                        {player.gameRank}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'right', fontWeight: 'bold', color: player.valoScore >= 90 ? '#4eff8a' : '#ff4655' }}>
                      {player.valoScore} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
