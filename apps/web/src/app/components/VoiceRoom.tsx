'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useRoomContext,
} from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';
import '@livekit/components-styles';
import AudioSettings from '@/components/AudioSettings';
import ContextMenu from '@/components/ContextMenu';
import { IconMic, IconMicOff, IconVolume2, IconX, IconShield, IconUser, IconHeadphones } from '@/components/Icons';

interface SessionInfo {
  id: string;
  username: string;
  avatar: string;
}

interface ParticipantData {
  identity: string;
  name: string;
  avatar?: string;
  isSpeaking: boolean;
  isMuted?: boolean;
}

interface MemberInfo {
  id: string;
  name?: string;
  avatar?: string | null;
  inVoice: boolean;
  isMuted?: boolean;
  valoScore: number;
}

interface VoiceRoomProps {
  lobbyId: string;
  session: SessionInfo | null;
  isCaptain?: boolean;
  members?: MemberInfo[];
  onLeave?: () => void;
}

function ParticipantsList({ isCaptain, roomName, avatars }: { isCaptain: boolean; roomName: string; avatars: Map<string, string> }) {
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Microphone, Track.Source.ScreenShareAudio]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; identity: string; name: string } | null>(null);

  useEffect(() => {
    const update = () => {
      setParticipants(Array.from(room.remoteParticipants.values()));
    };
    update();
    room.on(RoomEvent.ParticipantConnected, update);
    room.on(RoomEvent.ParticipantDisconnected, update);
    return () => {
      room.off(RoomEvent.ParticipantConnected, update);
      room.off(RoomEvent.ParticipantDisconnected, update);
    };
  }, [room]);

  const handleMute = async (identity: string, muted: boolean) => {
    await fetch('/api/livekit/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: roomName, identity, action: muted ? 'mute' : 'unmute' }),
    });
  };

  const handleRemove = async (identity: string) => {
    await fetch('/api/livekit/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: roomName, identity, action: 'remove' }),
    });
  };

  const handleContextMenu = (e: React.MouseEvent, p: any) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, identity: p.identity, name: p.name || p.identity });
  };

  const items = contextMenu ? [
    {
      label: `查看 ${contextMenu.name}`,
      icon: <IconUser size={12} />,
      onClick: () => window.open(`/player/${contextMenu.identity}`, '_blank'),
    },
    ...(isCaptain ? [
      {
        label: `靜音 ${contextMenu.name}`,
        icon: <IconMicOff size={12} />,
        onClick: () => handleMute(contextMenu.identity, true),
      },
      {
        label: `解除靜音 ${contextMenu.name}`,
        icon: <IconMic size={12} />,
        onClick: () => handleMute(contextMenu.identity, false),
      },
      {
        label: `移出 ${contextMenu.name}`,
        icon: <IconX size={12} />,
        onClick: () => handleRemove(contextMenu.identity),
        danger: true,
      },
    ] : []),
  ] : [];

  return (
    <div style={{ marginTop: '10px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2px', marginBottom: '6px',
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          語音成員 — {participants.length + 1}
        </span>
        {isCaptain && <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)' }}><IconShield size={10} /> 房主</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {participants.map((p) => {
          const audioPub = p.getTrackPublication(Track.Source.Microphone);
          const isMuted = audioPub?.isMuted;
          const isSpeaking = p.isSpeaking;
          const avatarUrl = avatars.get(p.identity);
          const displayName = p.name || p.identity;

          return (
            <div
              key={p.identity}
              onContextMenu={(e) => handleContextMenu(e, p)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 8px', borderRadius: '6px',
                background: isSpeaking ? 'rgba(122,162,247,0.08)' : 'transparent',
                cursor: isCaptain ? 'context-menu' : 'default',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = isSpeaking ? 'rgba(122,162,247,0.12)' : 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isSpeaking ? 'rgba(122,162,247,0.08)' : 'transparent'; }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconUser size={14} />
                  </div>
                )}
                <span style={{
                  position: 'absolute', bottom: '-1px', right: '-1px',
                  width: '12px', height: '12px', borderRadius: '50%',
                  background: isSpeaking ? '#9ece6a' : isMuted ? '#f7768e' : '#6b7280',
                  border: '2px solid var(--bg-primary)',
                  boxShadow: isSpeaking ? '0 0 6px rgba(158,206,106,0.6)' : 'none',
                }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                {isMuted ? <IconMicOff size={12} /> : <IconMic size={12} />}
              </div>
            </div>
          );
        })}
      </div>

      {participants.length === 0 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px 8px', fontStyle: 'italic' }}>
          等待其他成員加入語音...
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

export default function VoiceRoom({ lobbyId, session, isCaptain, members, onLeave }: VoiceRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const roomName = `lobby-${lobbyId}`;

  const getToken = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/livekit/token?room=${roomName}&identity=${session.id}&name=${encodeURIComponent(session.username)}`);
      if (!res.ok) throw new Error('無法取得語音權杖');
      const data = await res.json();
      setToken(data.token);
    } catch (err: any) {
      setError(err.message || '連線失敗');
    } finally {
      setLoading(false);
    }
  }, [roomName, session]);

  if (!session) {
    return (
      <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
        <div style={{ opacity: 0.4, marginBottom: '8px' }}><IconHeadphones size={24} /></div>
        <div>請先登入以使用語音聊天</div>
      </div>
    );
  }

  if (!livekitUrl) {
    return (
      <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
        <div style={{ opacity: 0.4, marginBottom: '8px' }}><IconHeadphones size={24} /></div>
        <div>LiveKit 尚未設定</div>
      </div>
    );
  }

  if (!token && !loading) {
    return (
      <div style={{ marginTop: '10px' }}>
        <button
          onClick={getToken}
          className="btn-primary"
          style={{
            width: '100%', padding: '12px', fontSize: '0.85rem',
            justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px',
            background: 'linear-gradient(135deg, #7aa2f7, #5d8fe8)',
            border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600,
            cursor: 'pointer', transition: 'opacity 0.15s',
          }}
        >
          <IconMic size={16} /> 加入語音聊天
        </button>
        {error && (
          <div style={{ marginTop: '8px', padding: '10px', fontSize: '0.8rem', color: 'var(--accent-red)', background: 'rgba(247,118,142,0.1)', borderRadius: '6px', border: '1px solid rgba(247,118,142,0.2)' }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: '8px' }}>
      {token && (
        <LiveKitRoom
          serverUrl={livekitUrl}
          token={token}
          connect={true}
          audio={true}
          onConnected={() => setConnected(true)}
          onDisconnected={() => { setToken(null); setConnected(false); onLeave?.(); }}
          style={{ height: 'auto' }}
        >
          <div style={{
            borderRadius: '10px',
            border: '1px solid rgba(122,162,247,0.25)',
            background: 'rgba(122,162,247,0.04)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 14px 8px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent-blue)', display: 'flex' }}><IconVolume2 size={14} /></span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                  語音聊天室
                  {isCaptain && <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: 'var(--accent-cyan)' }}><IconShield size={10} /> 房主</span>}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                  background: connected ? '#9ece6a' : '#f7768e',
                  boxShadow: connected ? '0 0 6px rgba(158,206,106,0.5)' : 'none',
                }} />
                <span style={{ fontSize: '0.72rem', color: connected ? 'var(--accent-green)' : 'var(--text-secondary)', fontWeight: 500 }}>
                  {connected ? '已連線' : '連線中...'}
                </span>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-muted)',
                    borderRadius: '6px', color: 'var(--text-secondary)',
                    cursor: 'pointer', padding: '4px 10px', fontSize: '0.72rem',
                    fontWeight: 500, transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                >
                  音訊設定
                </button>
              </div>
            </div>

            {/* Audio Settings */}
            {showSettings && (
              <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <AudioSettings onClose={() => setShowSettings(false)} />
              </div>
            )}

            {/* Control Bar */}
            <div style={{ padding: '8px 14px' }}>
              <ControlBar controls={{ microphone: true, leave: true, settings: false }} />
            </div>

            {/* Room Audio */}
            <RoomAudioRenderer />

            {/* Participants */}
            <div style={{ padding: '2px 14px 12px' }}>
              <ParticipantsList
                isCaptain={!!isCaptain}
                roomName={roomName}
                avatars={new Map(members?.filter(m => m.avatar).map(m => [m.id, m.avatar!]) || [])}
              />
            </div>
          </div>
        </LiveKitRoom>
      )}
    </div>
  );
}
