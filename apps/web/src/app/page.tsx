'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

interface LobbyMember {
  id: string;
  riotId: string;
  inVoice: boolean;
  valoScore: number;
}

interface Lobby {
  id: string;
  mode: string;
  minRank: string;
  description: string;
  captainId: string;
  captainName: string;
  captainAvatar: string;
  valoScore: number;
  currentCount: number;
  maxCount: number;
  status: string;
  voiceChannelId: string | null;
  discordGuildId: string | null;
  membersList?: LobbyMember[];
}

interface Session {
  id: string;
  username: string;
  avatar: string;
  riotId: string | null;
  rank: string | null;
  valoScore: number;
}

export default function Home() {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [filterMode, setFilterMode] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Authentication State
  const [session, setSession] = useState<Session | null>(null);

  // Form States
  const [showForm, setShowForm] = useState(false);
  const [formRiotId, setFormRiotId] = useState('');
  const [formDiscordId, setFormDiscordId] = useState('');
  const [formGameMode, setFormGameMode] = useState('Competitive');
  const [formMinRank, setFormMinRank] = useState('Diamond');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Parse session cookie on client load
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
        const parsed = JSON.parse(sessionCookie);
        setSession(parsed);
        // Pre-fill form fields with session data if logged in
        setFormRiotId(parsed.riotId || '');
        setFormDiscordId(parsed.id || '');
      } catch (err) {
        console.error('Failed to parse user session cookie:', err);
      }
    }
  }, []);

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

  const handleJoinLobby = async (lobbyId: string) => {
    if (!session) {
      window.location.href = '/api/auth/login';
      return;
    }

    try {
      const res = await fetch('/api/lobbies/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyId,
          userId: session.id
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert('成功加入隊伍！已同步至 Discord 卡片！✅');
        fetchLobbies();
      } else {
        alert(`無法加入房間: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('網路連線失敗，請重試。');
    }
  };

  const handleCaptainAction = async (lobbyId: string, action: 'start' | 'close') => {
    if (!session) return;

    try {
      const res = await fetch('/api/lobbies/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyId,
          action,
          userId: session.id
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (action === 'start') {
          alert('戰局已開始！臨時語音頻道已自動建立！');
        } else {
          alert('隊伍房間已解散！');
        }
        fetchLobbies();
      } else {
        alert(`操作失敗: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('連線伺服器失敗，請稍後重試。');
    }
  };

  const filteredLobbies = filterMode === 'All' 
    ? lobbies 
    : lobbies.filter(l => l.mode === filterMode);

  return (
    <div className="container">
      {/* Premium Header */}
      <header className={styles.header}>
        <div className={styles.logo} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo.png" alt="ValoLink Logo" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
          <Link href="/">VALOLINK<span className={styles.logoDot}>.GG</span></Link>
        </div>
        <nav className={styles.nav}>
          <Link href="/" className={`${styles.navLink} ${styles.navActive}`}>組隊大廳 (Lobby)</Link>
          <Link href="/leaderboard" className={styles.navLink}>信用排行榜 (ValoScore)</Link>
          <Link href="/dashboard" className={styles.navLink}>個人控制台 (Dashboard)</Link>
        </nav>
        {session ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={session.avatar} alt={session.username} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
            <Link href="/dashboard" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
              主控台
            </Link>
          </div>
        ) : (
          <a href="/api/auth/login" className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>
            登入 / LOGIN
          </a>
        )}
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
          <a href="/api/auth/login" className="btn-secondary">Discord 帳號登入</a>
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
            {filteredLobbies.map((lobby) => {
              const isUserInLobby = lobby.membersList?.some(m => m.id === session?.id) || false;
              const isCaptain = lobby.captainId === session?.id;
              const isFull = lobby.currentCount >= lobby.maxCount;

              return (
                <div key={lobby.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: lobby.status === 'PLAYING' ? '1px solid #28a745' : '1px solid var(--border-color)' }}>
                  <div>
                    <div className={styles.cardHeader}>
                      <span className={styles.modeBadge} style={{ backgroundColor: lobby.status === 'PLAYING' ? '#28a745' : 'var(--primary-blue)' }}>
                        {lobby.mode} {lobby.status === 'PLAYING' && '• 進行中'}
                      </span>
                      <span className={styles.rankLimit}>🏆 {lobby.minRank} +</span>
                    </div>
                    <p className={styles.cardDesc}>{lobby.description}</p>
                  </div>
                  
                  <div>
                    <div className={styles.cardFooter} style={{ marginBottom: '12px' }}>
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

                    {/* Actions Panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {/* Captain Controls */}
                      {isCaptain && lobby.status === 'OPEN' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <button 
                            onClick={() => handleCaptainAction(lobby.id, 'start')}
                            className="btn-primary" 
                            style={{ padding: '8px', fontSize: '0.85rem', justifyContent: 'center', backgroundColor: '#28a745' }}
                          >
                            ⚔️ 出發開打
                          </button>
                          <button 
                            onClick={() => handleCaptainAction(lobby.id, 'close')}
                            className="btn-secondary" 
                            style={{ padding: '8px', fontSize: '0.85rem', justifyContent: 'center' }}
                          >
                            🗑️ 解散房間
                          </button>
                        </div>
                      )}

                      {/* Captain Controls (when already Playing) */}
                      {isCaptain && lobby.status === 'PLAYING' && (
                        <button 
                          onClick={() => handleCaptainAction(lobby.id, 'close')}
                          className="btn-secondary" 
                          style={{ padding: '8px', fontSize: '0.85rem', justifyContent: 'center', width: '100%' }}
                        >
                          🗑️ 結束並關閉房間
                        </button>
                      )}

                      {/* Member Voice Room Access Link */}
                      {isUserInLobby && lobby.status === 'PLAYING' && lobby.voiceChannelId && (
                        <a 
                          href={`https://discord.com/channels/${lobby.discordGuildId}/${lobby.voiceChannelId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary"
                          style={{ 
                            padding: '10px', 
                            fontSize: '0.85rem', 
                            justifyContent: 'center', 
                            backgroundColor: '#28a745',
                            boxShadow: '0 0 10px rgba(40, 167, 69, 0.4)',
                            textAlign: 'center',
                            display: 'block'
                          }}
                        >
                          🎙️ 進入 Discord 戰術語音房
                        </a>
                      )}

                      {/* Standard Join Button (only shown for open lobbies when not joined) */}
                      {!isCaptain && lobby.status === 'OPEN' && (
                        <button 
                          onClick={() => handleJoinLobby(lobby.id)}
                          disabled={isUserInLobby || isFull}
                          className={isUserInLobby ? "btn-secondary" : "btn-primary"}
                          style={{ 
                            width: '100%', 
                            fontSize: '0.85rem', 
                            padding: '8px', 
                            justifyContent: 'center',
                            backgroundColor: isUserInLobby ? '#f3f4f6' : (isFull ? '#e5e7eb' : 'var(--btn-green)'),
                            color: isUserInLobby ? 'var(--text-secondary)' : '#ffffff',
                            border: isUserInLobby ? '1px solid var(--border-color)' : 'none',
                            cursor: (isUserInLobby || isFull) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isUserInLobby ? '✓ 已加入隊伍 (Joined)' : (isFull ? '人數已滿 (Full)' : '一鍵加入房間 (Join)')}
                        </button>
                      )}

                      {/* Match in Progress Indicator (for non-members) */}
                      {!isCaptain && !isUserInLobby && lobby.status === 'PLAYING' && (
                        <button 
                          disabled 
                          className="btn-secondary"
                          style={{ 
                            width: '100%', 
                            fontSize: '0.85rem', 
                            padding: '8px', 
                            justifyContent: 'center',
                            cursor: 'not-allowed',
                            backgroundColor: '#f3f4f6'
                          }}
                        >
                          ⚔️ 戰局進行中 (Playing)
                        </button>
                      )}
                    </div>

                    {/* Real-time Voice Link Members Roster */}
                    {lobby.membersList && lobby.membersList.length > 0 && (
                      <div style={{ borderTop: '1px solid #f1f2f4', paddingTop: '12px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>隊員語音狀態 (Voice Status)</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {lobby.membersList.map((m) => (
                            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ 
                                  width: '8px', 
                                  height: '8px', 
                                  borderRadius: '50%', 
                                  background: m.inVoice ? '#238636' : '#cbd5e1',
                                  boxShadow: m.inVoice ? '0 0 8px #2ea44f' : 'none',
                                  display: 'inline-block'
                                }} />
                                <span style={{ color: m.inVoice ? '#238636' : 'var(--text-primary)', fontWeight: m.inVoice ? '600' : 'normal' }}>
                                  {m.riotId}
                                </span>
                                {m.inVoice && <span style={{ fontSize: '0.75rem', color: '#238636', fontWeight: '600' }}>(🎙️ 語音中)</span>}
                              </span>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>信用: {m.valoScore} pts</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
