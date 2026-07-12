'use client';

import React from 'react';
import { useMediaDeviceSelect, useRoomContext } from '@livekit/components-react';
import { IconMic, IconVolume2, IconX } from '@/components/Icons';

interface AudioSettingsProps {
  onClose: () => void;
}

export default function AudioSettings({ onClose }: AudioSettingsProps) {
  const room = useRoomContext();

  const micDevices = useMediaDeviceSelect({ kind: 'audioinput', room });
  const speakerDevices = useMediaDeviceSelect({ kind: 'audiooutput', room });

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-default)',
      borderRadius: '8px',
      padding: '12px',
      marginTop: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>音訊設定</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}>
          <IconX size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 500 }}>
            <IconMic /> 麥克風
          </label>
          <select
            value={micDevices.activeDeviceId}
            onChange={(e) => micDevices.setActiveMediaDevice(e.target.value)}
            style={{
              width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-default)',
              background: 'var(--bg-inset)', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none'
            }}
          >
            {micDevices.devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `麥克風 ${d.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 500 }}>
            <IconVolume2 /> 喇叭 / 耳機
          </label>
          <select
            value={speakerDevices.activeDeviceId}
            onChange={(e) => speakerDevices.setActiveMediaDevice(e.target.value)}
            style={{
              width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-default)',
              background: 'var(--bg-inset)', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none'
            }}
          >
            {speakerDevices.devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `喇叭 ${d.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
