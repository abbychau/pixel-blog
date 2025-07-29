'use client';

import { useState, useEffect } from 'react';
import { LogIn, LogOut, Github, Settings, User, DollarSign, Gift } from 'lucide-react';
import Link from 'next/link';
import { signInWithGoogle, signInWithGitHub, signOutUser } from '@/lib/firebase';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import Avatar from './Avatar';

interface UserProfile {
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

interface DailyClaimStatus {
  canClaim: boolean;
  dailyBonus: number;
  currentBalance: number;
  hoursUntilNext: number;
  nextClaimTime?: string;
  streak: number;
}

export default function AuthButtons() {
  const { user, loading } = useFirebaseAuth();
  const { authenticatedFetch, sessionToken, isCreatingSession } = useAuthenticatedFetch();
  const [authLoading, setAuthLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [claimStatus, setClaimStatus] = useState<DailyClaimStatus | null>(null);
  const [claiming, setClaiming] = useState(false);

  const showStatus = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  // Fetch user profile when authenticated
  useEffect(() => {
    if (user && !loading && sessionToken && !isCreatingSession) {
      console.log('🔍 AuthButtons: User authenticated, fetching profile and claim status');
      console.log('🔍 User:', user?.email, 'Session token available:', !!sessionToken);
      fetchUserProfile();
      fetchClaimStatus();
    } else {
      console.log('🔍 AuthButtons: No user or loading or no session token, clearing profile data');
      console.log('🔍 State:', { user: !!user, loading, sessionToken: !!sessionToken, isCreatingSession });
      setUserProfile(null);
      setClaimStatus(null);
    }
  }, [user, loading, sessionToken, isCreatingSession]);

  const fetchUserProfile = async () => {
    try {
      console.log('🔍 Fetching user profile with session token:', !!sessionToken);
      const response = await authenticatedFetch('/api/auth/user-info');
      console.log('🔍 User profile response:', response.status, response.statusText);
      if (response.ok) {
        const userData = await response.json();
        console.log('🔍 User profile data:', userData);
        setUserProfile(userData.user);
      } else {
        const errorData = await response.text();
        console.error('❌ User profile fetch failed:', response.status, errorData);
      }
    } catch (error) {
      console.error('❌ Failed to fetch user profile:', error);
    }
  };

  const fetchClaimStatus = async () => {
    try {
      console.log('🔍 Fetching claim status with session token:', !!sessionToken);
      const response = await authenticatedFetch('/api/claim-daily');
      console.log('🔍 Claim status response:', response.status, response.statusText);
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Claim status data:', data);
        setClaimStatus(data);
      } else {
        const errorData = await response.text();
        console.error('❌ Claim status fetch failed:', response.status, errorData);
      }
    } catch (error) {
      console.error('❌ Failed to fetch claim status:', error);
    }
  };

  const handleDailyClaim = async () => {
    setClaiming(true);
    try {
      const response = await authenticatedFetch('/api/claim-daily', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showStatus(`✅ CLAIMED ${data.claimed} M-COIN! (${data.previousBalance} → ${data.newBalance})`, 'success');
        // Refresh both profile and claim status
        fetchUserProfile();
        fetchClaimStatus();
      } else {
        if (response.status === 429) {
          showStatus(`⏰ Already claimed today! Next claim in ${data.canClaimAgainIn}`, 'info');
        } else {
          showStatus(`❌ ${data.error}`, 'error');
        }
      }
    } catch (error) {
      console.error('Failed to claim daily reward:', error);
      showStatus('❌ Network error during claim', 'error');
    } finally {
      setClaiming(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      showStatus('Google sign-in successful', 'success');
    } catch (error) {
      console.error('Google sign-in failed:', error);
      showStatus('Google sign-in failed', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setAuthLoading(true);
    try {
      await signInWithGitHub();
      showStatus('GitHub sign-in successful', 'success');
    } catch (error) {
      console.error('GitHub sign-in failed:', error);
      showStatus('GitHub sign-in failed', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    try {
      await signOutUser();
      showStatus('Signed out successfully', 'success');
    } catch (error) {
      console.error('Sign out failed:', error);
      showStatus('Sign out failed', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-xs terminal-green">
        AUTH STATUS: <span className="terminal-yellow">CHECKING...</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="text-xs space-y-2">
        <div className="terminal-green">
          AUTH STATUS: <span className="terminal-yellow">AUTHENTICATED</span>
        </div>
        
        {/* Status Message */}
        {statusMessage && (
          <div className={`text-xs p-2 rounded border ${
            statusType === 'success' ? 'bg-green-500/10 border-green-500 text-green-400' :
            statusType === 'error' ? 'bg-red-500/10 border-red-500 text-red-400' :
            'bg-blue-500/10 border-blue-500 text-blue-400'
          }`}>
            {statusMessage}
          </div>
        )}
        
        {userProfile ? (
          <div className="space-y-2">
            {/* User Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="terminal-blue">USER:</span>
                <Avatar 
                  src={userProfile.avatar} 
                  alt={userProfile.display_name || userProfile.username}
                  size="xs"
                  fallbackColor={userProfile.display_color || 'var(--bloomberg-fallback-user-color)'}
                />
                <Link
                  href="/profile"
                  className="font-bold hover:underline transition-colors"
                  style={{ color: userProfile.display_color || 'var(--bloomberg-fallback-user-color)' }}
                  title="View Profile"
                >
                  {userProfile.display_name?.toUpperCase() || userProfile.username?.toUpperCase()}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <span className="terminal-blue">ID:</span>
                <span className="terminal-green font-mono">#{String(userProfile.id).padStart(3, '0')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="terminal-blue">ROLE:</span>
                <span className={`font-bold ${
                  userProfile.role === 'admin' ? 'text-red-400' : 
                  userProfile.role === 'editor' ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {userProfile.role.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="terminal-blue">M-COIN:</span>
                <span className="flex items-center gap-1 terminal-yellow font-bold">
                  <DollarSign size={10} />
                  {userProfile.currency1 ?? 0}
                </span>
              </div>
              {claimStatus && (
                <div className="flex items-center gap-2">
                  <span className="terminal-blue">DAILY:</span>
                  {claimStatus.canClaim ? (
                    <button
                      onClick={handleDailyClaim}
                      disabled={claiming}
                      className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded transition-colors disabled:opacity-50 font-bold"
                      title={`Claim ${claimStatus.dailyBonus} M-Coin daily reward`}
                    >
                      <Gift size={10} />
                      {claiming ? 'CLAIMING...' : `+${claimStatus.dailyBonus}`}
                    </button>
                  ) : (
                    <span 
                      className="text-xs terminal-gray"
                      title={claimStatus.nextClaimTime ? `Next claim available at ${new Date(claimStatus.nextClaimTime).toLocaleString()}` : 'Already claimed today'}
                    >
                      {claimStatus.hoursUntilNext > 0 ? `${claimStatus.hoursUntilNext}h` : 'CLAIMED'}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-1 text-xs terminal-orange hover:bg-bloomberg-darkgray px-2 py-1 rounded transition-colors"
              >
                <User size={12} />
                PROFILE
              </Link>
              <button
                onClick={handleSignOut}
                disabled={authLoading}
                className="flex items-center gap-1 text-xs text-red-400 hover:bg-red-400/10 px-2 py-1 rounded transition-colors disabled:opacity-50"
              >
                <LogOut size={12} />
                {authLoading ? 'LOADING...' : 'SIGN OUT'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="terminal-yellow">Loading account info...</div>
            <div className="flex gap-2">
              <button
                onClick={handleSignOut}
                disabled={authLoading}
                className="flex items-center gap-1 text-xs text-red-400 hover:bg-red-400/10 px-2 py-1 rounded transition-colors disabled:opacity-50"
              >
                <LogOut size={12} />
                {authLoading ? 'LOADING...' : 'SIGN OUT'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="text-xs space-y-2">
      <div className="terminal-blue">AUTH STATUS: <span className="text-red-400">GUEST</span></div>
      
      {/* Status Message */}
      {statusMessage && (
        <div className={`text-xs p-2 rounded border ${
          statusType === 'success' ? 'bg-green-500/10 border-green-500 text-green-400' :
          statusType === 'error' ? 'bg-red-500/10 border-red-500 text-red-400' :
          'bg-blue-500/10 border-blue-500 text-blue-400'
        }`}>
          {statusMessage}
        </div>
      )}
      
      <div className="flex gap-2">
        <button
          onClick={handleGoogleSignIn}
          disabled={authLoading}
          className="flex items-center gap-1 text-xs terminal-orange hover:bg-bloomberg-darkgray px-2 py-1 rounded transition-colors disabled:opacity-50"
        >
          <LogIn size={12} />
          {authLoading ? 'SIGNING IN...' : 'GOOGLE'}
        </button>
        <button
          onClick={handleGitHubSignIn}
          disabled={authLoading}
          className="flex items-center gap-1 text-xs terminal-orange hover:bg-bloomberg-darkgray px-2 py-1 rounded transition-colors disabled:opacity-50"
        >
          <Github size={12} />
          {authLoading ? 'SIGNING IN...' : 'GITHUB'}
        </button>
      </div>
    </div>
  );
}