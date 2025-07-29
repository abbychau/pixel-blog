'use client';

import { useEffect, useState } from 'react';
import { User, Save, DollarSign } from 'lucide-react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import AvatarUpload from '@/components/AvatarUpload';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';

interface User {
  id: number;
  username: string;
  display_name: string;
  email: string;
  role: string;
  display_color?: string;
  currency1?: number;
  avatar?: string;
  created_at: string;
}

const PRESET_COLORS = [
  { name: 'Terminal Green', value: '#00ff00' },
  { name: 'Bloomberg Blue', value: '#0080ff' },
  { name: 'Terminal Orange', value: '#ff8c00' },
  { name: 'Bloomberg Yellow', value: '#b3b600ff' },
  { name: 'Magenta', value: '#ff0080' },
  { name: 'Cyan', value: '#00ffff' },
  { name: 'Red', value: '#ff4444' },
  { name: 'Pink', value: '#ff69b4' },
  { name: 'Lime', value: '#32cd32' },
  { name: 'Gold', value: '#ffd700' },
  { name: 'Violet', value: '#8a2be2' },
  { name: 'Turquoise', value: '#40e0d0' },
  { name: 'Coral', value: '#ff7f50' },
  { name: 'Sky Blue', value: '#87ceeb' },
  { name: 'Light Green', value: '#90ee90' },
  { name: 'White', value: '#ffffff' }
];

export default function ProfilePage() {
  const { authenticatedFetch } = useAuthenticatedFetch();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Status messages
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [displayColor, setDisplayColor] = useState('#00ff00');

  // Helper function for status messages
  const showStatus = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await authenticatedFetch('/api/auth/user-info');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        setDisplayName(userData.user.display_name || '');
        setDisplayColor(userData.user.display_color || '#00ff00');
        setLoading(false);
      } else {
        showStatus('ERROR: Failed to load user data', 'error');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      showStatus('ERROR: Network error', 'error');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      showStatus('VALIDATION ERROR: Display name is required', 'error');
      return;
    }

    if (displayName.length > 50) {
      showStatus('VALIDATION ERROR: Display name must be 50 characters or less', 'error');
      return;
    }

    setSaving(true);

    try {
      const response = await authenticatedFetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: displayName.trim(),
          display_color: displayColor,
        }),
      });

      if (response.ok) {
        showStatus('PROFILE UPDATED SUCCESSFULLY', 'success');
        fetchUserData(); // Refresh user data
      } else {
        const errorData = await response.json();
        showStatus(`ERROR: ${errorData.error || 'Failed to update profile'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showStatus('ERROR: Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout titlePrefix="Profile" currentPage="profile">
        <div className="p-8">
          <div className="terminal-orange">LOADING USER PROFILE...</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!user) {
    return (
      <AuthenticatedLayout titlePrefix="Profile" currentPage="profile">
        <div className="p-8">
          <div className="bloomberg-panel">
            <h1 className="text-2xl font-bold terminal-orange mb-4">ERROR</h1>
            <p className="terminal-yellow mb-4">UNABLE TO LOAD USER PROFILE</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout titlePrefix="Profile" currentPage="profile">
      <div className="p-8">
        {/* Status Message */}
        {statusMessage && (
          <div className={`mb-4 p-3 rounded border ${
            statusType === 'success' ? 'bg-green-500/10 border-green-500 text-green-400' :
            statusType === 'error' ? 'bg-red-500/10 border-red-500 text-red-400' :
            'bg-blue-500/10 border-blue-500 text-blue-400'
          }`}>
            {statusMessage}
          </div>
        )}

        <div className="bloomberg-panel">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold terminal-orange tracking-wider">USER PROFILE</h2>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bloomberg-button disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Information */}
            <div className="space-y-6">
              <div className="bloomberg-panel">
                <h3 className="text-lg font-bold terminal-orange mb-4">ACCOUNT INFO</h3>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-bloomberg-gray">User ID:</span>
                      <div className="terminal-green font-mono">{String(user.id).padStart(3, '0')}</div>
                    </div>
                    <div>
                      <span className="text-bloomberg-gray">Display Name:</span>
                      <div 
                        className="font-bold"
                        style={{ color: user.display_color || 'var(--bloomberg-fallback-user-color)' }}
                      >
                        {user.display_name || 'Not Set'}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-bloomberg-gray">Username:</span>
                      <div className="terminal-blue font-mono">@{user.username}</div>
                    </div>
                    <div>
                      <span className="text-bloomberg-gray">Color:</span>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded border border-bloomberg-gray"
                          style={{ backgroundColor: user.display_color || 'var(--bloomberg-fallback-user-color)' }}
                        />
                        <span className="font-mono text-xs terminal-gray">
                          {user.display_color || 'var(--bloomberg-fallback-user-color)'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-bloomberg-gray">Email:</span>
                      <div className="terminal-yellow">{user.email}</div>
                    </div>
                    <div>
                      <span className="text-bloomberg-gray">Role:</span>
                      <div className={`font-bold ${
                        user.role === 'admin' ? 'text-red-400' : 
                        user.role === 'editor' ? 'text-yellow-400' : 'text-blue-400'
                      }`}>
                        {user.role.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-bloomberg-gray">Member Since:</span>
                      <div className="terminal-green">{new Date(user.created_at).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-bloomberg-gray">M-Coin:</span>
                      <div className="flex items-center gap-1 font-bold terminal-yellow">
                        <DollarSign size={14} />
                        {user.currency1 ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Currency Info */}
              <div className="bloomberg-panel">
                <h3 className="text-lg font-bold terminal-orange mb-4 flex items-center gap-2">
                  <DollarSign size={18} />
                  M-COIN SYSTEM
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="p-4 border border-bloomberg-gray rounded bg-bloomberg-darkgray/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-bloomberg-gray">Current Balance:</span>
                      <span className="flex items-center gap-1 font-bold text-lg terminal-yellow">
                        <DollarSign size={16} />
                        {user?.currency1 ?? 0}
                      </span>
                    </div>
                    <div className="text-xs terminal-gray space-y-1">
                      <div>• M-Coin is used to purchase custom URL slugs for your articles</div>
                      <div>• You receive {user?.role === 'admin' ? 'unlimited M-Coin (admin)' : 'daily login bonuses'}</div>
                      <div>• Default articles use numeric IDs (free)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Display Name Preview */}
              <div className="bloomberg-panel">
                <h3 className="text-lg font-bold terminal-orange mb-4">PREVIEW</h3>
                <div className="space-y-3">
                  <div className="text-sm text-bloomberg-gray">How your name will appear:</div>
                  <div className="p-4 border border-bloomberg-gray rounded bg-bloomberg-darkgray/30">
                    <div className="flex items-center gap-2">
                      <span className="text-bloomberg-gray">Author:</span>
                      <span style={{ color: displayColor }} className="font-bold">
                        {loading ? 'Loading...' : (displayName.trim() || user?.display_name || 'No Name Set')}
                      </span>
                      <span className="text-xs terminal-blue">(@{user?.username || 'loading'})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Form */}
            <div className="space-y-6">
              <div className="bloomberg-panel">
                <h3 className="text-lg font-bold terminal-orange mb-4">EDIT PROFILE</h3>
                
                <div className="space-y-6">
                  {/* Avatar Upload */}
                  <AvatarUpload
                    currentAvatar={user?.avatar}
                    onAvatarUpdate={(avatarUrl) => {
                      setUser(prev => prev ? { ...prev, avatar: avatarUrl } : null);
                    }}
                  />

                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-bold terminal-orange mb-2">DISPLAY NAME *</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bloomberg-input w-full"
                      placeholder="Your display name..."
                      maxLength={50}
                    />
                    <div className="text-xs terminal-gray mt-1">
                      {(displayName || '').length}/50 characters • This is how your name appears on articles
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-bold terminal-orange mb-2">USERNAME COLOR</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setDisplayColor(color.value)}
                          className={`w-8 h-8 rounded border-2 transition-all ${
                            displayColor === color.value 
                              ? 'border-white shadow-lg' 
                              : 'border-bloomberg-gray hover:border-bloomberg-orange'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                    <div className="text-xs terminal-gray">
                      Selected: <span style={{ color: displayColor }}>{displayColor}</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Action Buttons */}
              <div className="bloomberg-panel">
                <h3 className="text-lg font-bold terminal-orange mb-4">ACTIONS</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bloomberg-button disabled:opacity-50"
                  >
                    {saving ? 'UPDATING PROFILE...' : 'SAVE CHANGES'}
                  </button>
                  <button
                    onClick={() => {
                      setDisplayName(user.display_name);
                      setDisplayColor(user.display_color || '#00ff00');
                      showStatus('CHANGES RESET', 'info');
                    }}
                    className="w-full py-2 px-4 border border-bloomberg-gray text-bloomberg-gray hover:bg-bloomberg-gray hover:text-black transition-colors"
                  >
                    RESET CHANGES
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}