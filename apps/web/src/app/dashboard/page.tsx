'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

interface Session {
  id: string;
  username: string;
  avatar: string;
  riotId: string | null;
  rank: string | null;
  valoScore: number;
}

interface HistoricalSquad {
  id: string;
  gameMode: string;
  minRank: string;
  description: string;
  status: string;
  captain: string;
  joinedAt: string;
  memberCount: number;
}

interface Teammate {
  id: string;
  riotId: string;
  valoScore: number;
}

interface CreditPoint {
  date: string;
  score: number;
  reason: string;
}

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  
  // Dashboard Data
  const [stats, setStats] = useState<any>(null);
  const [squads, setSquads] = useState<HistoricalSquad[]>([]);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [history, setHistory] = useState<CreditPoint[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Parse cookie on client side
  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
      return null;
    };

    const sessionCookie = getCookie('user_session');
    if (sessionCookie) {
      try {
        setSession(JSON.parse(sessionCookie));
      } catch (err) {
        console.error('Failed to parse user session cookie:', err);
      }
    }
    setLoadingSession(false);
  }, []);

  // Fetch stats from database once logged in
  useEffect(() => {
    if (!session) return;

    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/user/stats?userId=${session.id}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setSquads(data.historicalSquads);
          setTeammates(data.pastTeammates);
          setHistory(data.creditHistory);
        }
      } catch (err) {
        console.error('Failed to load user stats:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchStats();
  }, [session]);

  // Render SVG Chart for ValoScore Trend
  const renderTrendChart = () => {
    if (history.length === 0) return null;

    const width = 600;
    const height = 150;
    const padding = 20;

    // Map scores to coordinates
    const minScore = 30; // Lowest score limit
    const maxScore = 100;
    const xStep = (width - padding * 2) / Math.max(history.length - 1, 1);
    
    const points = history.map((pt, i) => {
      const x = padding + i * xStep;
      // Invert Y coordinate since SVG (0,0) is top-left
      const y = height - padding - ((pt.score - minScore) / (maxScore - minScore)) * (height - padding * 2);
      return { x, y, ...pt };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ display: 'block' }}>
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border-color)" strokeDasharray="4" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-color)" strokeDasharray="4" />
          
          {/* Main trend line */}
          <path d={pathD} fill="none" stroke="var(--primary-blue)" strokeWidth="2.5" />
          
          {/* Points */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="4" fill="var(--bg-primary)" stroke="var(--primary-blue)" strokeWidth="2" />
              <text x={p.x} y={p.y - 8} fontSize="10" fill="var(--text-secondary)" textAnchor="middle" fontWeight="bold">
                {p.score}
              </text>
            </g>
          ))}
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>起始信用值</span>
          <span>最新行為評估</span>
        </div>
      </div>
    );
  };

  if (loadingSession) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)' }}>
        驗證憑證中...
      </div>
    );
  }

  // Gated Auth Screen
  if (!session) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '450px', width: '100%', textAlign: 'center', padding: '40px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.5px' }}>
            VALOLINK<span className={styles.logoDot}>.GG</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '32px' }}>
            請先使用 Discord 帳號登入，以同步您的伺服器列表、揪團紀錄與個人戰績面板。
          </p>
          <a href="/api/auth/login" className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', fontSize: '1rem', padding: '12px' }}>
            💬 經由 Discord 登入 (OAuth2)
          </a>
          <div style={{ marginTop: '20px' }}>
            <Link href="/" style={{ color: 'var(--primary-blue)', fontSize: '0.85rem' }}>返回組隊大廳</Link>
          </div>
        </div>
      </div>
    );
  }

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
        <a href="/api/auth/logout" className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>
          登出 / LOGOUT
        </a>
      </header>

      {loadingData || !stats ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
          同步您的特戰戰績與對局記錄中...
        </div>
      ) : (
        <>
          {/* User Hero Info Panel */}
          <section className="glass-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', marginBottom: '32px' }}>
            <img 
              src={session.avatar} 
              alt={session.username} 
              style={{ width: '72px', height: '72px', borderRadius: '50%', border: '2px solid var(--border-color)' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.5px' }}>{stats.riotId}</h2>
                <span style={{ background: '#ddf4ff', color: 'var(--primary-blue)', border: '1px solid rgba(9,105,218,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {stats.rank}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                Discord 帳號: @{session.username} (ID: {session.id})
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>ValoScore 信用分</span>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', color: stats.valoScore >= 90 ? '#238636' : '#ff4655' }}>
                {stats.valoScore} <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>pts</span>
              </span>
            </div>
          </section>

          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="glass-card" style={{ padding: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>🎮 累計組隊場次</span>
              <h3 style={{ fontSize: '2rem', marginTop: '8px', fontWeight: 700 }}>{stats.squadCount} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>場對局</span></h3>
            </div>
            <div className="glass-card" style={{ padding: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>🛡️ 隊友平均信用度</span>
              <h3 style={{ fontSize: '2rem', marginTop: '8px', fontWeight: 700 }}>{stats.averageTeammateScore} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>pts</span></h3>
            </div>
            <div className="glass-card" style={{ padding: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>📈 模擬勝率指標</span>
              <h3 style={{ fontSize: '2rem', marginTop: '8px', fontWeight: 700 }}>{stats.winRate}% <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>W/L</span></h3>
            </div>
          </div>

          {/* Chart and History Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', marginBottom: '80px', alignItems: 'start' }}>
            
            {/* Left Side: Chart & Matches */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>🛡️ ValoScore 信用分歷史走勢</h3>
                {renderTrendChart()}
              </div>

              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>歷史組隊紀錄</h3>
                {squads.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>目前尚未有任何歷史揪團對局資料。</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                          <th style={{ padding: '10px' }}>模式</th>
                          <th style={{ padding: '10px' }}>隊長</th>
                          <th style={{ padding: '10px' }}>備註</th>
                          <th style={{ padding: '10px' }}>日期</th>
                          <th style={{ padding: '10px', textAlign: 'right' }}>狀態</th>
                        </tr>
                      </thead>
                      <tbody>
                        {squads.map((s) => (
                          <tr key={s.id} style={{ borderBottom: '1px solid #f1f2f4' }}>
                            <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{s.gameMode}</td>
                            <td style={{ padding: '12px 10px' }}>{s.captain}</td>
                            <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{s.description}</td>
                            <td style={{ padding: '12px 10px' }}>{s.joinedAt}</td>
                            <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                              <span style={{
                                background: s.status === 'PLAYING' ? '#ddf4ff' : '#f1f2f4',
                                color: s.status === 'PLAYING' ? 'var(--primary-blue)' : 'var(--text-secondary)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}>
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Teammates Met */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>🤝 合作過的隊友</h3>
              {teammates.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>目前尚未有任何共同對局玩家。</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {teammates.map((t) => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', padding: '8px 0', borderBottom: '1px solid #f1f2f4' }}>
                      <span style={{ fontWeight: '500' }}>{t.riotId}</span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: t.valoScore >= 90 ? '#238636' : '#ff4655' 
                      }}>
                        {t.valoScore} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}
