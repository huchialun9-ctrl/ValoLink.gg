export interface SignalMessage {
  from: string;
  to: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  data: any;
  timestamp: number;
}

export interface VoiceParticipant {
  userId: string;
  username: string;
  avatar: string;
  joinedAt: number;
}

export interface VoiceRoom {
  id: string;
  lobbyId: string;
  participants: Map<string, VoiceParticipant>;
  signals: SignalMessage[];
  createdAt: number;
}

const rooms = new Map<string, VoiceRoom>();

function generateRoomId(): string {
  return 'voice-' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
}

export function createRoom(lobbyId: string): string {
  const id = generateRoomId();
  rooms.set(id, {
    id,
    lobbyId,
    participants: new Map(),
    signals: [],
    createdAt: Date.now(),
  });
  return id;
}

export function getRoom(roomId: string): VoiceRoom | undefined {
  return rooms.get(roomId);
}

export function getRoomByLobby(lobbyId: string): VoiceRoom | undefined {
  for (const room of rooms.values()) {
    if (room.lobbyId === lobbyId) return room;
  }
  return undefined;
}

export function listRooms(): { id: string; lobbyId: string; participantCount: number }[] {
  const result: { id: string; lobbyId: string; participantCount: number }[] = [];
  for (const room of rooms.values()) {
    if (room.participants.size > 0) {
      result.push({ id: room.id, lobbyId: room.lobbyId, participantCount: room.participants.size });
    }
  }
  return result;
}

export function joinRoom(roomId: string, participant: VoiceParticipant): VoiceParticipant[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  room.participants.set(participant.userId, participant);
  const existing: VoiceParticipant[] = [];
  for (const p of room.participants.values()) {
    if (p.userId !== participant.userId) {
      existing.push(p);
    }
  }
  return existing;
}

export function leaveRoom(roomId: string, userId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  room.participants.delete(userId);
  room.signals.push({
    from: userId,
    to: 'all',
    type: 'offer',
    data: { type: 'user-left' },
    timestamp: Date.now(),
  });
  if (room.participants.size === 0) {
    rooms.delete(roomId);
  }
  return true;
}

export function addSignal(roomId: string, signal: SignalMessage): void {
  const room = rooms.get(roomId);
  if (!room) return;
  room.signals.push(signal);
  if (room.signals.length > 1000) {
    room.signals.splice(0, 100);
  }
}

export function getSignals(roomId: string, userId: string, since: number = 0): SignalMessage[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return room.signals.filter(
    (s) => s.timestamp > since && (s.to === userId || s.to === 'all')
  );
}

export function getParticipants(roomId: string): VoiceParticipant[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.participants.values());
}

export function isUserInRoom(roomId: string, userId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  return room.participants.has(userId);
}
