'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

interface SessionInfo {
  id: string;
  username: string;
  avatar: string;
}

interface VoiceRoomProps {
  lobbyId: string;
  session: SessionInfo | null;
  onLeave?: () => void;
}

function ParticipantsList() {
  const tracks = useTracks([Track.Source.Microphone, Track.Source.ScreenShareAudio]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
      {tracks.map((track) => (
        <div key={track.participant.identity} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 10px', borderRadius: '6px',
          background: 'rgba(255,255,255,0.05)', fontSize: '0.85rem'
        }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: track.participant.isSpeaking ? '#4eff8a' : '#6b7280',
            display: 'inline-block',
            boxShadow: track.participant.isSpeaking ? '0 0 8px #4eff8a' : 'none'
          }} />
          <span style={{ fontWeight: 600 }}>{track.participant.name || track.participant.identity}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {track.participant.isSpeaking ? '說話中' : '在線'}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function VoiceRoom({ lobbyId, session, onLeave }: VoiceRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  const getToken = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/livekit/token?room=lobby-${lobbyId}&identity=${session.id}`);
      if (!res.ok) throw new Error('無法取得語音權杖');
      const data = await res.json();
      setToken(data.token);
    } catch (err: any) {
      setError(err.message || '連線失敗');
    } finally {
      setLoading(false);
    }
  }, [lobbyId, session]);

  if (!session) {
    return (
      <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        請先登入以使用語音聊天
      </div>
    );
  }

  if (!livekitUrl) {
    return (
      <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        LiveKit 尚未設定（缺少 NEXT_PUBLIC_LIVEKIT_URL）
      </div>
    );
  }

  if (!token && !loading) {
    return (
      <div style={{ marginTop: '12px' }}>
        <button
          onClick={getToken}
          disabled={loading}
          className="btn-primary"
          style={{ width: '100%', padding: '10px', fontSize: '0.85rem', justifyContent: 'center', backgroundColor: '#6366f1', borderColor: '#6366f1' }}
        >
          {loading ? '連線中...' : '加入語音聊天 (LiveKit)'}
        </button>
        {error && (
          <div style={{ marginTop: '8px', padding: '8px', fontSize: '0.8rem', color: '#ff4655', background: 'rgba(255,70,85,0.1)', borderRadius: '4px' }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: '12px' }}>
      {token && (
        <LiveKitRoom
          serverUrl={livekitUrl}
          token={token}
          connect={true}
          audio={true}
          onConnected={() => setConnected(true)}
          onDisconnected={() => { setToken(null); setConnected(false); onLeave?.(); }}
          style={{ height: 'auto', minHeight: '200px' }}
        >
          <div className="glass-card" style={{
            padding: '12px',
            border: '1px solid #6366f1',
            boxShadow: '0 0 12px rgba(99,102,241,0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6366f1' }}>
                語音聊天室 (LiveKit)
              </span>
              <span style={{ fontSize: '0.75rem', color: connected ? '#4eff8a' : 'var(--text-secondary)' }}>
                {connected ? '已連線' : '連線中...'}
              </span>
            </div>
            <ControlBar controls={{ microphone: true, leave: true }} />
            <RoomAudioRenderer />
            <ParticipantsList />
          </div>
        </LiveKitRoom>
      )}
    </div>
  );
}
