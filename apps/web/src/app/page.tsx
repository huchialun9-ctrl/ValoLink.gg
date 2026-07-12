'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import VoiceRoom from './components/VoiceRoom';
import BotInfo from '@/components/BotInfo';
import { useAuth } from '@/lib/AuthContext';
import { IconGlobe, IconAlertTriangle, IconTrophy, IconSwords, IconTrash2, IconCheck, IconMic } from '@/components/Icons';

interface LobbyMember {
  id: string;
  name: string;
  avatar?: string | null;
  inVoice: boolean;
  isMuted?: boolean;
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
  discordGuildId: string | null;
  membersList?: LobbyMember[];
}

export default function Home() {
  const { session } = useAuth();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [filterMode, setFilterMode] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formRiotId, setFormRiotId] = useState('');
  const [formGameMode, setFormGameMode] = useState('Competitive');
  const [formMinRank, setFormMinRank] = useState('Diamond');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session) {
      setFormRiotId(session.riotId || '');
    }
  }, [session]);

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
    let es: EventSource;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      es = new EventSource('/api/lobbies/stream');

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'snapshot' || data.type === 'update') {
            setLobbies(data.lobbies);
            setError(null);
            setLoading(false);
          }
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };

      es.onerror = () => {
        es.close();
        retryTimeout = setTimeout(connect, 5000);
        setError('即時連線中斷，嘗試重連...');
      };
    };

    connect();
    return () => {
      es?.close();
      clearTimeout(retryTimeout);
    };
  }, []);

  const handleCreateLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRiotId.includes('#')) {
      alert('Riot ID 格式必須包含 # (例如: TenZ#NA1)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/lobbies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captainName: formRiotId,
          userId: session?.id,
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
        alert('成功加入隊伍！');
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

      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Find Your Perfect <span className={styles.heroHighlight}>Squad</span>
        </h1>
        <p className={styles.heroSubtitle}>
          特戰英豪獨立組隊平台。透過真實戰績驗證與信用評分，一鍵媒合神隊友，內建語音系統，不用跳轉任何軟體。
        </p>
        <div className={styles.heroButtons}>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '關閉建立面板' : <><IconGlobe /> 開房間</>}
          </button>
          <a href="/auth" className="btn-secondary">註冊 / 登入</a>
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
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>使用者 ID</label>
                <input
                  type="text"
                  placeholder="使用者 ID"
                  value={session?.id || ''}
                  disabled
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
            正在同步組隊大廳資料...
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
              <IconAlertTriangle /> 目前沒有活躍的揪團隊伍
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 24px', fontSize: '0.95rem' }}>
               現在大廳內空空如也。點擊上方按鈕在網頁直接發起隊伍，快速建立第一個戰術組隊！
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
                      <span className={styles.rankLimit}><IconTrophy /> {lobby.minRank} +</span>
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
                            <IconSwords /> 出發開打
                          </button>
                          <button 
                            onClick={() => handleCaptainAction(lobby.id, 'close')}
                            className="btn-secondary" 
                            style={{ padding: '8px', fontSize: '0.85rem', justifyContent: 'center' }}
                          >
                            <IconTrash2 /> 解散房間
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
                            <IconTrash2 /> 結束並關閉房間
                          </button>
                      )}

                      {/* Web Voice Chat (available to all lobby members) */}
                      {(isUserInLobby || isCaptain) && (
                        <VoiceRoom lobbyId={lobby.id} session={session} isCaptain={isCaptain} members={lobby.membersList || []} />
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
                          <IconSwords /> 戰局進行中 (Playing)
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
                                  {m.name || m.id}
                                </span>
                                {m.inVoice && <span style={{ fontSize: '0.75rem', color: '#238636', fontWeight: '600' }}>(<IconMic /> 語音中)</span>}
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
      <BotInfo />
    </div>
  );
}
