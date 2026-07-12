'use client';

import { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ParticipantLoop,
  ParticipantName,
  useTracks,
  TrackToggle,
  DisconnectButton,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

interface VoiceRoomProps {
  roomName: string;
  identity: string;
  displayName: string;
  onLeave?: () => void;
}

function Participants() {
  const tracks = useTracks([Track.Source.Microphone]);
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      {tracks.length === 0 && (
        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>等待隊友加入語音...</span>
      )}
      <ParticipantLoop participants={tracks.map(t => t.participant)}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: '#1e293b',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.8rem',
          color: '#e2e8f0',
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          <ParticipantName />
        </div>
      </ParticipantLoop>
    </div>
  );
}

export default function VoiceRoom({ roomName, identity, displayName, onLeave }: VoiceRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({
      roomName,
      identity,
      name: displayName,
    });
    fetch(`/api/livekit/token?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          setToken(data.token);
          setServerUrl(data.url);
        } else {
          setError(data.error || '無法取得語音權杖');
        }
      })
      .catch(() => setError('無法連線至語音伺服器'))
      .finally(() => setLoading(false));
  }, [roomName, identity, displayName]);

  if (loading) {
    return (
      <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
        正在連線語音房間...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '12px', textAlign: 'center', color: '#ef4444', fontSize: '0.85rem' }}>
        {error}
      </div>
    );
  }

  if (!token) return null;

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={true}
      video={false}
      onConnected={() => setConnected(true)}
      onDisconnected={onLeave}
      style={{ width: '100%' }}
    >
      <RoomAudioRenderer />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-default)',
        marginTop: '4px',
      }}>
        <TrackToggle source={Track.Source.Microphone} />
        <Participants />
        <div style={{ marginLeft: 'auto' }}>
          <DisconnectButton onClick={onLeave}>
            <span style={{ color: 'var(--accent-red)', fontSize: '13px', fontWeight: 500 }}>離開語音</span>
          </DisconnectButton>
        </div>
      </div>
    </LiveKitRoom>
  );
}
