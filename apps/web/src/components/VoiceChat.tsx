'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IconMic, IconVolume2, IconMicOff, IconX } from '@/components/Icons';

interface VoiceParticipant {
  userId: string;
  username: string;
  avatar: string;
}

interface PeerEntry {
  pc: RTCPeerConnection;
  stream?: MediaStream;
}

const STUN_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface VoiceChatProps {
  lobbyId: string;
  session: { id: string; username: string; avatar: string } | null;
}

export default function VoiceChat({ lobbyId, session }: VoiceChatProps) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [inVoice, setInVoice] = useState(false);
  const [muted, setMuted] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSignalTimeRef = useRef<number>(0);
  const joinedRef = useRef(false);

  const cleanupPeers = useCallback(() => {
    for (const entry of peersRef.current.values()) {
      entry.pc.close();
    }
    peersRef.current.clear();
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const leaveRoom = useCallback(async () => {
    if (!roomId || !session) return;
    stopPolling();
    joinedRef.current = false;

    await fetch(`/api/voice/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: session.id }),
    }).catch(() => {});

    cleanupPeers();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setMicStream(null);
    setInVoice(false);
    setRoomId(null);
    setParticipants([]);
  }, [roomId, session, cleanupPeers, stopPolling]);

  useEffect(() => {
    return () => {
      stopPolling();
      cleanupPeers();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stopPolling, cleanupPeers]);

  const addPeerConnection = useCallback(
    (peerId: string, isInitiator: boolean) => {
      if (!localStreamRef.current || !session || !roomId) return;
      if (peersRef.current.has(peerId)) return;

      const pc = new RTCPeerConnection(STUN_SERVERS);

      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          fetch(`/api/voice/rooms/${roomId}/signal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: session.id,
              to: peerId,
              type: 'ice-candidate',
              data: e.candidate,
            }),
          }).catch(() => {});
        }
      };

      pc.ontrack = (e) => {
        const entry = peersRef.current.get(peerId);
        if (entry) {
          entry.stream = e.streams[0];
        }
        setParticipants((prev) => [...prev]);
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          pc.close();
          peersRef.current.delete(peerId);
          setParticipants((prev) => [...prev]);
        }
      };

      peersRef.current.set(peerId, { pc });

      if (isInitiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            fetch(`/api/voice/rooms/${roomId}/signal`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: session.id,
                to: peerId,
                type: 'offer',
                data: pc.localDescription,
              }),
            }).catch(() => {});
          })
          .catch(console.error);
      }

      return pc;
    },
    [roomId, session]
  );

  const handleSignal = useCallback(
    async (signal: any) => {
      if (!session || !roomId) return;

      if (signal.type === 'offer') {
        const pc = addPeerConnection(signal.from, false);
        if (!pc) return;

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await fetch(`/api/voice/rooms/${roomId}/signal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: session.id,
              to: signal.from,
              type: 'answer',
              data: pc.localDescription,
            }),
          });
        } catch (err) {
          console.error('Error handling offer:', err);
        }
      } else if (signal.type === 'answer') {
        const entry = peersRef.current.get(signal.from);
        if (entry && entry.pc.signalingState === 'have-local-offer') {
          try {
            await entry.pc.setRemoteDescription(new RTCSessionDescription(signal.data));
          } catch (err) {
            console.error('Error handling answer:', err);
          }
        }
      } else if (signal.type === 'ice-candidate') {
        const entry = peersRef.current.get(signal.from);
        if (entry) {
          try {
            await entry.pc.addIceCandidate(new RTCIceCandidate(signal.data));
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        }
      }
    },
    [roomId, session, addPeerConnection]
  );

  const pollSignals = useCallback(async () => {
    if (!roomId || !session || !joinedRef.current) return;

    try {
      const res = await fetch(
        `/api/voice/rooms/${roomId}/signal?userId=${session.id}&since=${lastSignalTimeRef.current}`
      );
      if (!res.ok) return;
      const data = await res.json();
      lastSignalTimeRef.current = data.serverTime;

      for (const signal of data.signals) {
        if (signal.data?.type === 'user-left') {
          const entry = peersRef.current.get(signal.from);
          if (entry) {
            entry.pc.close();
            peersRef.current.delete(signal.from);
          }
          setParticipants((prev) => prev.filter((p) => p.userId !== signal.from));
        } else {
          await handleSignal(signal);
        }
      }
    } catch {
      // ignore polling errors
    }
  }, [roomId, session, handleSignal]);

  const joinVoice = async () => {
    if (!session) {
      window.location.href = '/api/auth/login';
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let currentRoomId: string;

      const roomRes = await fetch('/api/voice/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyId }),
      });

      if (!roomRes.ok) throw new Error('Failed to create room');
      const roomData = await roomRes.json();
      currentRoomId = roomData.roomId;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setMicStream(stream);

      const joinRes = await fetch(`/api/voice/rooms/${currentRoomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.id,
          username: session.username,
          avatar: session.avatar,
        }),
      });

      if (!joinRes.ok) throw new Error('Failed to join room');
      const joinData = await joinRes.json();

      setRoomId(currentRoomId);
      setInVoice(true);
      joinedRef.current = true;

      const existingParticipants: VoiceParticipant[] = joinData.participants || [];
      setParticipants(existingParticipants);

      for (const p of existingParticipants) {
        addPeerConnection(p.userId, true);
      }

      lastSignalTimeRef.current = Date.now();
      pollingRef.current = setInterval(pollSignals, 1000);
    } catch (err: any) {
      setError(err.message || '無法加入語音頻道');
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = muted;
        setMuted(!muted);
      }
    }
  };

  return (
    <div style={{ marginTop: '12px' }}>
      {!inVoice ? (
        <button
          onClick={joinVoice}
          disabled={loading || !session}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '0.85rem',
            justifyContent: 'center',
            backgroundColor: loading ? undefined : '#6366f1',
            borderColor: loading ? undefined : '#6366f1',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '連線中...' : <><IconMic /> 加入語音聊天 (Web)</>}
        </button>
      ) : (
        <div
          className="glass-card"
          style={{
            padding: '12px',
            border: '1px solid #6366f1',
            boxShadow: '0 0 12px rgba(99,102,241,0.25)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6366f1' }}>
              <IconVolume2 /> 網頁語音聊天室
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={toggleMute}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: muted ? 'rgba(255,70,85,0.2)' : 'rgba(78,255,138,0.15)',
                  color: muted ? '#ff4655' : '#4eff8a',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {muted ? <><IconMicOff /> 已靜音</> : <><IconMic /> 通話中</>}
              </button>
              <button
                onClick={leaveRoom}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,70,85,0.4)',
                  background: 'rgba(255,70,85,0.15)',
                  color: '#ff4655',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <IconX /> 離開
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 8px',
                borderRadius: '4px',
                background: 'rgba(99,102,241,0.1)',
                fontSize: '0.82rem',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: muted ? '#ff4655' : '#4eff8a',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontWeight: 600 }}>{session?.username || '你'}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {muted ? '已靜音' : '說話中'}
              </span>
            </div>

              {participants
              .filter((p) => p.userId !== session?.id)
              .map((p) => {
                const entry = peersRef.current.get(p.userId);
                return (
                  <div
                    key={p.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.82rem',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: entry?.pc?.connectionState === 'connected' ? '#4eff8a' : '#6b7280',
                        display: 'inline-block',
                      }}
                    />
                    <span>{p.username}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      {entry?.pc?.connectionState === 'connected'
                        ? '已連線'
                        : entry?.pc?.connectionState === 'connecting'
                          ? '連線中...'
                          : '未連線'}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            fontSize: '0.8rem',
            color: '#ff4655',
            background: 'rgba(255,70,85,0.1)',
            borderRadius: '4px',
          }}
        >
          {error}
        </div>
      )}

      {!session && (
        <div
          style={{
            marginTop: '8px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            textAlign: 'center',
          }}
        >
          請先登入以使用語音聊天功能
        </div>
      )}
    </div>
  );
}
