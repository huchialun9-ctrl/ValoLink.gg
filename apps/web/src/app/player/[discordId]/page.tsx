'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { use } from 'react';
import styles from '../../page.module.css';
import { IconAlertTriangle, IconBarChart3, IconThumbsUp, IconThumbsDown, IconMoon, IconTrendingUp, IconGamepad2, IconCircle } from '@/components/Icons';

interface PlayerProfile {
  id: string;
  riotId: string | null;
  rank: string | null;
  valoScore: number;
  isSuspicious: boolean;
  memberSince: string;
  ratingStats: {
    totalRatings: number;
    goodCount: number;
    toxicCount: number;
    afkCount: number;
  };
  creditHistory: { date: string; score: number; reason: string }[];
  recentSquads: {
    id: string;
    gameMode: string;
    status: string;
    captain: string;
    joinedAt: string;
  }[];
}

export default function PlayerPage({ params }: { params: Promise<{ discordId: string }> }) {
  const { discordId } = use(params);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/player/${discordId}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setPlayer(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [discordId]);

  const scoreColor = (s: number) => s >= 90 ? '#4eff8a' : s >= 60 ? '#e5c158' : '#ff4655';
  const ScoreLabel = ({ s }: { s: number }) => {
    if (s >= 90) return <><IconCircle color="#4eff8a" /> 優良信用</>;
    if (s >= 60) return <><IconCircle color="#e5c158" /> 一般信用</>;
    return <><IconCircle color="#ff4655" /> 不良信用</>;
  };

  const renderChart = () => {
    if (!player || player.creditHistory.length < 2) return null;
    const w = 560, h = 120, p = 16;
    const minS = 0, maxS = 100;
    const xStep = (w - p * 2) / Math.max(player.creditHistory.length - 1, 1);
    const pts = player.creditHistory.map((pt, i) => ({
      x: p + i * xStep,
      y: h - p - ((pt.score - minS) / (maxS - minS)) * (h - p * 2),
      ...pt
    }));
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const fillD = d + ` L ${pts[pts.length-1].x} ${h-p} L ${pts[0].x} ${h-p} Z`;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff4655" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ff4655" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#chartFill)" />
        <path d={d} fill="none" stroke="#ff4655" strokeWidth="2" />
        {pts.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="#ff4655" />
        ))}
      </svg>
    );
  };

  if (loading) return (
    <div className="container" style={{ padding: '100px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
      載入玩家資料中...
    </div>
  );

  if (notFound || !player) return (
    <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>找不到此玩家</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>該玩家尚未在 ValoLink.gg 上註冊</p>
      <Link href="/" className="btn-primary">返回大廳</Link>
    </div>
  );

  return (
    <div className="container" style={{ paddingTop: '32px', paddingBottom: '80px' }}>

      {/* Hero Card */}
      <div className="glass-card animate-fade-in" style={{ display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
        {/* Avatar placeholder */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff4655, #cc2233)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 800, color: '#fff', flexShrink: 0
        }}>
          {(player.riotId || player.id)[0].toUpperCase()}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
              {player.riotId || player.id}
            </h1>
            {player.rank && (
              <span className="badge badge-cyan">{player.rank}</span>
            )}
            {player.isSuspicious && (
              <span className="badge badge-red"><IconAlertTriangle /> 可疑行為</span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            使用者 ID: {player.id} · 加入時間: {player.memberSince}
          </p>
        </div>

        {/* ValoScore */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>
            ValoScore
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: scoreColor(player.valoScore), lineHeight: 1 }}>
            {player.valoScore}
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 400 }}> pts</span>
          </div>
          <div style={{ fontSize: '0.8rem', marginTop: '4px' }}><ScoreLabel s={player.valoScore} /></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Rating Stats */}
          <div className="glass-card animate-fade-in">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}><IconBarChart3 /> 隊友評分統計</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { label: '友善', count: player.ratingStats.goodCount, color: '#4eff8a', icon: <IconThumbsUp /> },
                { label: '嘴砲', count: player.ratingStats.toxicCount, color: '#ff4655', icon: <IconThumbsDown /> },
                { label: '掛網', count: player.ratingStats.afkCount, color: '#8b949e', icon: <IconMoon /> },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-secondary)', borderRadius: '6px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>{s.icon} {s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'right', marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              共 {player.ratingStats.totalRatings} 筆評分紀錄
            </div>
          </div>

          {/* ValoScore Chart */}
          <div className="glass-card animate-fade-in">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}><IconTrendingUp /> 信用分歷史走勢</h3>
            {player.creditHistory.length < 2 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>目前尚無足夠資料繪製走勢圖</p>
            ) : renderChart()}
          </div>
        </div>

        {/* Recent Squads */}
        <div className="glass-card animate-fade-in">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}><IconGamepad2 /> 近期揪團紀錄</h3>
          {player.recentSquads.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>尚無揪團紀錄</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {player.recentSquads.map(s => (
                <div key={s.id} style={{ background: 'var(--bg-secondary)', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.gameMode}</span>
                    <span className={`badge ${s.status === 'OPEN' ? 'badge-green' : s.status === 'PLAYING' ? 'badge-cyan' : 'badge-red'}`}>
                      {s.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    隊長: {s.captain} · {s.joinedAt}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
