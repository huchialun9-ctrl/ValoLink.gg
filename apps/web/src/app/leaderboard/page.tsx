'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';
import { useAuth } from '@/lib/AuthContext';
import { IconTrophy, IconCrown, IconSearch, IconBarChart3, IconAlertTriangle, IconAward, IconGamepad2 } from '@/components/Icons';

interface LeaderboardUser {
  rank: number;
  id: string;
  riotId: string;
  gameRank: string;
  valoScore: number;
  joinedAt: string;
}

export default function Leaderboard() {
  const { session } = useAuth();
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
      {/* Hero Header */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          <IconTrophy size={24} /> ValoScore <span className={styles.heroHighlight}>信用排行榜</span>
        </h1>
        <p className={styles.heroSubtitle}>
          基於賽後匿名互評機制的信用積分系統。系統將優先保護高信用分玩家，杜絕惡意擺爛與言語暴力。
        </p>
      </section>

      {/* Leaderboard Table Section */}
      <section style={{ paddingBottom: '80px' }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><IconCrown /> 頂尖信用玩家</h2>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}><IconSearch size={14} /></span>
            <input
              type="text"
              placeholder="搜尋 Riot ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ width: '240px', paddingLeft: '30px' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <><IconBarChart3 /> 載入排行榜中...</>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
            <><IconAlertTriangle /> 沒有找到相符的信用玩家紀錄。</>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th><IconAward /> 排名</th>
                  <th><IconGamepad2 /> 玩家 Riot ID</th>
                  <th>使用者 ID</th>
                  <th><IconTrophy /> 遊戲牌位</th>
                  <th style={{ textAlign: 'right' }}>ValoScore</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => (
                  <tr key={player.id}>
                    <td style={{ fontWeight: 600, color: player.rank <= 3 ? 'var(--accent-orange)' : 'var(--text-primary)' }}>
                      #{player.rank}
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {player.riotId}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {player.id}
                    </td>
                    <td>
                      <span className={`badge ${player.gameRank === '未配對牌位' ? 'badge-orange' : 'badge-blue'}`}>
                        {player.gameRank}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: player.valoScore >= 90 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
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
