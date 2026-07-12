'use client';

import React, { useState } from 'react';
import { IconBot, IconCommand, IconUsers, IconShield, IconGamepad2, IconCheck, IconZap, IconX } from '@/components/Icons';

const commands = [
  { cmd: '/create', desc: '建立組隊房間，設定模式、牌位限制', icon: <IconGamepad2 /> },
  { cmd: '/join', desc: '快速加入大廳內的房間', icon: <IconUsers /> },
  { cmd: '/start', desc: '隊長出發開打，自動建立語音頻道', icon: <IconZap /> },
  { cmd: '/close', desc: '隊長解散房間，釋出隊員', icon: <IconX /> },
  { cmd: '/rate', desc: '打完給隊友評分（友善/嘴砲/掛網）', icon: <IconCheck /> },
  { cmd: '/link', desc: '綁定你的 Riot ID 跟平台帳號', icon: <IconShield /> },
];

export default function BotInfo() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: '48px' }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary"
        style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.9rem' }}
      >
        <IconBot size={18} /> 平台指令列表
        <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '0.8rem' }}>
          {open ? '收起' : '展開'}
        </span>
      </button>

      {open && (
        <div className="glass-card" style={{ marginTop: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-muted)' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(122,162,247,0.12)', border: '1px solid rgba(122,162,247,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent-blue)'
            }}>
              <IconBot size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>ValoLink 平台指令</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                輸入 <code style={{ background: 'var(--bg-inset)', padding: '1px 5px', borderRadius: '3px', fontSize: '0.78rem' }}>/</code> 開頭的指令使用
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
            {commands.map((c) => (
              <div key={c.cmd} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '6px',
                background: 'var(--bg-secondary)', fontSize: '0.85rem'
              }}>
                <span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>{c.icon}</span>
                <div>
                  <code style={{
                    background: 'var(--bg-inset)', padding: '1px 6px', borderRadius: '3px',
                    fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-cyan)'
                  }}>
                    {c.cmd}
                  </code>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                    {c.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '16px', padding: '12px', borderRadius: '6px',
            background: 'rgba(122,162,247,0.06)', border: '1px solid rgba(122,162,247,0.15)',
            fontSize: '0.8rem', color: 'var(--text-secondary)'
          }}>
            <IconShield /> 需要管理員先執行 <code style={{ background: 'var(--bg-inset)', padding: '1px 5px', borderRadius: '3px' }}>/setup</code> 初始化設定。
          </div>
        </div>
      )}
    </div>
  );
}
