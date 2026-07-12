'use client';

import { useState, useRef } from 'react';
import { IconUser, IconCamera } from './Icons';

interface AvatarUploadProps {
  currentAvatar?: string | null;
  displayName?: string | null;
  onAvatarChange: (url: string | null) => void;
}

export default function AvatarUpload({ currentAvatar, displayName, onAvatarChange }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('圖片不能超過 2MB');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);
    setUploading(true);

    try {
      const res = await fetch('/api/user/avatar', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setPreview(data.avatar);
        onAvatarChange(data.avatar);
      } else {
        alert(data.error || '上傳失敗');
      }
    } catch {
      alert('上傳失敗');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    try {
      const res = await fetch('/api/user/avatar', { method: 'DELETE' });
      if (res.ok) {
        setPreview(null);
        onAvatarChange(null);
      }
    } catch {
      alert('重設失敗');
    }
  };

  const avatarSrc = preview || currentAvatar;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ position: 'relative', width: '80px', height: '80px' }}>
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt="avatar"
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-muted)' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--border-muted)',
          }}>
            <IconUser size={32} />
          </div>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            position: 'absolute', bottom: '0', right: '0',
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'var(--accent-blue)', border: '2px solid var(--bg-primary)',
            color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem',
          }}
          title="更換頭像"
        >
          <IconCamera size={12} />
        </button>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={handleFile} style={{ display: 'none' }} />
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{displayName || '未設定名稱'}</div>
        {currentAvatar && (
          <button onClick={handleRemove} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.8rem', padding: '4px 0' }}>
            移除頭像
          </button>
        )}
        {uploading && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>上傳中...</div>}
      </div>
    </div>
  );
}
