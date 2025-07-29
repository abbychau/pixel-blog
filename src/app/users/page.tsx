'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, UserPlus } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';

interface User {
  id: number;
  username: string;
  display_name: string;
  email: string;
  role: string;
  is_active: boolean;
  display_color?: string;
  created_at: string;
}

interface UserStats {
  [userId: number]: {
    article_count: number;
    published_count: number;
    draft_count: number;
    mention_count: number;
    last_activity?: string;
  };
}

export default function UsersPage() {
  const router = useRouter();
  const { authenticatedFetch } = useAuthenticatedFetch();
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // User profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({
    display_name: '',
    email: '',
    role: '',
    display_color: '',
    is_active: true
  });
  
  // Status messages
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');

  // Form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');

  // Helper function for status messages
  const showStatus = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      // Get current user info to check role
      const response = await authenticatedFetch('/api/auth/user-info');
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData.user);
        
        // Check if user is admin
        if (userData.user.role !== 'admin') {
          showStatus('ACCESS DENIED: ADMIN ROLE REQUIRED', 'error');
          setTimeout(() => {
            router.push('/');
          }, 1500);
          return;
        }
        
        // If admin, fetch users
        fetchUsers();
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      router.push('/');
    }
  };

  const fetchUsers = async () => {
    try {
      const [usersResponse, articlesResponse] = await Promise.all([
        authenticatedFetch('/api/admin/users'),
        authenticatedFetch('/api/admin/articles')
      ]);
      
      console.log('🔍 Users page - API responses:', {
        usersStatus: usersResponse.status,
        usersOk: usersResponse.ok,
        articlesStatus: articlesResponse.status,
        articlesOk: articlesResponse.ok
      });

      const usersData = await usersResponse.json();
      const articlesData = articlesResponse.ok ? await articlesResponse.json() : [];
      
      console.log('🔍 Users page - Response data:', {
        usersData: typeof usersData,
        isArray: Array.isArray(usersData),
        data: usersData
      });
      
      // Add proper error handling for non-array responses
      if (!Array.isArray(usersData)) {
        console.error('❌ Users page - Expected array response, got:', typeof usersData, usersData);
        setUsers([]);
        setLoading(false);
        return;
      }
      
      setUsers(usersData);
      
      // Calculate user statistics
      const stats: UserStats = {};
      for (const user of usersData) {
        const userArticles = articlesData.filter((article: any) => article.author_id === user.id);
        const publishedArticles = userArticles.filter((article: any) => article.status === 'published');
        const draftArticles = userArticles.filter((article: any) => article.status === 'draft');
        
        // Get latest article date for last activity
        const latestArticle = userArticles.sort((a: any, b: any) => 
          new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
        )[0];
        
        stats[user.id] = {
          article_count: userArticles.length,
          published_count: publishedArticles.length,
          draft_count: draftArticles.length,
          mention_count: 0, // We'll fetch this separately if needed
          last_activity: latestArticle ? (latestArticle.updated_at || latestArticle.created_at) : undefined
        };
      }
      
      setUserStats(stats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setDisplayName('');
    setEmail('');
    setPassword('');
    setRole('admin');
    setShowForm(false);
  };

  // Profile modal functions
  const openProfileModal = (user: User) => {
    setSelectedUser(user);
    setProfileForm({
      display_name: user.display_name,
      email: user.email,
      role: user.role,
      display_color: user.display_color || '#00ff00',
      is_active: user.is_active
    });
    setEditMode(false);
    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setSelectedUser(null);
    setEditMode(false);
    setProfileForm({
      display_name: '',
      email: '',
      role: '',
      display_color: '',
      is_active: true
    });
  };

  const handleProfileSave = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const response = await authenticatedFetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm),
      });

      if (response.ok) {
        showStatus('User profile updated successfully', 'success');
        closeProfileModal();
        fetchUsers(); // Refresh the users list
      } else {
        const errorData = await response.json();
        showStatus(`Update failed: ${errorData.error}`, 'error');
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      showStatus('Failed to update user profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!username.trim() || !displayName.trim() || !email.trim() || !password.trim()) {
      showStatus('VALIDATION ERROR: All fields are required', 'error');
      return;
    }

    setSaving(true);

    try {
      const response = await authenticatedFetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          display_name: displayName.trim(),
          email: email.trim(),
          password: password.trim(),
          role: role,
        }),
      });

      if (response.ok) {
        showStatus('USER CREATED SUCCESSFULLY', 'success');
        resetForm();
        fetchUsers();
      } else {
        const errorData = await response.json();
        showStatus(`ERROR: ${errorData.error || 'Failed to create user'}`, 'error');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      showStatus('ERROR: Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthenticatedLayout requireAdmin={true} titlePrefix="Users" currentPage="users">
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
            <h2 className="text-2xl font-bold terminal-orange tracking-wider">USER MANAGEMENT</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bloomberg-button"
            >
              <UserPlus size={16} />
              {showForm ? 'CANCEL' : 'CREATE USER'}
            </button>
          </div>

          {/* Create User Form */}
          {showForm && (
            <div className="mb-8 p-6 border border-bloomberg-gray rounded bg-bloomberg-darkgray">
              <h3 className="text-lg font-bold terminal-orange mb-4">CREATE NEW USER</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold terminal-orange mb-2">USERNAME *</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bloomberg-input w-full font-mono"
                      placeholder="username_123 (a-z, 0-9, _)"
                    />
                    <div className="text-xs terminal-gray mt-1">
                      3-20 characters, lowercase letters, numbers, and underscore only
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold terminal-orange mb-2">DISPLAY NAME *</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bloomberg-input w-full"
                      placeholder="John Doe"
                    />
                    <div className="text-xs terminal-gray mt-1">
                      1-50 characters, shown publicly
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold terminal-orange mb-2">EMAIL *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bloomberg-input w-full"
                      placeholder="user@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold terminal-orange mb-2">PASSWORD *</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bloomberg-input w-full"
                      placeholder="Enter password..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold terminal-orange mb-2">ROLE</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="bloomberg-input w-full"
                    >
                      <option value="admin">ADMIN</option>
                      <option value="editor">EDITOR</option>
                      <option value="author">AUTHOR</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 bloomberg-button disabled:opacity-50"
                    >
                      {saving ? 'CREATING...' : 'CREATE USER'}
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 border border-bloomberg-gray text-bloomberg-gray hover:bg-bloomberg-gray hover:text-black transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users List */}
          {loading ? (
            <div className="terminal-orange">LOADING USER DATABASE...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="bloomberg-table w-full">
                <thead>
                  <tr>
                    <th className="w-16">ID</th>
                    <th className="text-left">USER INFO</th>
                    <th className="w-24">ROLE</th>
                    <th className="w-20">STATUS</th>
                    <th className="w-32">ARTICLES</th>
                    <th className="w-32">ACTIVITY</th>
                    <th className="w-32">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const stats = userStats[user.id] || {
                      article_count: 0,
                      published_count: 0,
                      draft_count: 0,
                      mention_count: 0
                    };
                    
                    return (
                      <tr key={user.id}>
                        <td className="font-mono terminal-blue">
                          {String(user.id).padStart(3, '0')}
                        </td>
                        <td>
                          <div className="space-y-1">
                            <div 
                              className="font-bold"
                              style={{ color: user.display_color || 'var(--bloomberg-fallback-user-color)' }}
                            >
                              {user.display_name}
                            </div>
                            <div className="text-xs font-mono terminal-blue">
                              @{user.username}
                            </div>
                            <div className="text-xs terminal-gray">
                              {user.email}
                            </div>
                            <div className="text-xs terminal-gray">
                              Joined: {formatDate(user.created_at)}
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className={`px-2 py-1 text-xs font-bold rounded ${
                            user.role === 'admin' ? 'text-red-400 bg-red-500/10' : 
                            user.role === 'editor' ? 'text-yellow-400 bg-yellow-500/10' : 'text-blue-400 bg-blue-500/10'
                          }`}>
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className={user.is_active ? 'terminal-green' : 'text-red-400'}>
                            {user.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="space-y-1 text-xs">
                            <div className="font-bold terminal-yellow">
                              {stats.article_count} Total
                            </div>
                            <div className="terminal-green">
                              {stats.published_count} Published
                            </div>
                            <div className="terminal-blue">
                              {stats.draft_count} Drafts
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="space-y-1 text-xs">
                            {stats.last_activity ? (
                              <>
                                <div className="terminal-orange">
                                  Last Article
                                </div>
                                <div className="terminal-gray font-mono">
                                  {formatDate(stats.last_activity)}
                                </div>
                              </>
                            ) : (
                              <div className="terminal-gray">
                                No articles
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => openProfileModal(user)}
                              className="text-xs terminal-blue hover:terminal-orange transition-colors px-2 py-1 border border-bloomberg-blue hover:border-bloomberg-orange rounded"
                            >
                              VIEW PROFILE
                            </button>
                            <button
                              onClick={() => window.open(`/?author=${user.id}`, '_blank')}
                              className="text-xs terminal-green hover:terminal-orange transition-colors px-2 py-1 border border-bloomberg-green hover:border-bloomberg-orange rounded"
                            >
                              VIEW ARTICLES
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="text-center py-8 terminal-yellow">
                  NO USERS FOUND IN DATABASE
                  <br />
                  <button 
                    onClick={() => setShowForm(true)}
                    className="terminal-orange hover:underline"
                  >
                    CREATE YOUR FIRST USER
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      {showProfileModal && selectedUser && (
        <div className="fixed inset-0 bg-bloomberg-bg/80 flex items-center justify-center z-50">
          <div className="bg-bloomberg-bg border border-bloomberg-orange max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4 border-b border-bloomberg-gray pb-2">
                <h3 className="text-lg font-bold terminal-orange font-mono">
                  USER PROFILE #{selectedUser.id}
                </h3>
                <button
                  onClick={closeProfileModal}
                  className="terminal-gray hover:terminal-orange transition-colors text-xl"
                >
                  ×
                </button>
              </div>

              {/* User Basic Info (Read-only) */}
              <div className="mb-6 space-y-3">
                <div>
                  <label className="block text-xs terminal-blue mb-1">USERNAME</label>
                  <div className="text-sm terminal-yellow font-mono bg-bloomberg-darkgray px-3 py-2 border border-bloomberg-gray">
                    {selectedUser.username}
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs terminal-blue mb-1">USER ID</label>
                  <div className="text-sm terminal-green font-mono bg-bloomberg-darkgray px-3 py-2 border border-bloomberg-gray">
                    #{selectedUser.id}
                  </div>
                </div>

                <div>
                  <label className="block text-xs terminal-blue mb-1">CREATED</label>
                  <div className="text-sm terminal-gray font-mono bg-bloomberg-darkgray px-3 py-2 border border-bloomberg-gray">
                    {formatDate(selectedUser.created_at)}
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs terminal-blue mb-1">DISPLAY NAME</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={profileForm.display_name}
                      onChange={(e) => setProfileForm({...profileForm, display_name: e.target.value})}
                      className="w-full text-sm terminal-yellow font-mono bg-bloomberg-bg px-3 py-2 border border-bloomberg-orange focus:outline-none focus:ring-1 focus:ring-bloomberg-orange"
                    />
                  ) : (
                    <div className="text-sm terminal-yellow font-mono bg-bloomberg-darkgray px-3 py-2 border border-bloomberg-gray">
                      {selectedUser.display_name}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs terminal-blue mb-1">EMAIL</label>
                  {editMode ? (
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                      className="w-full text-sm terminal-yellow font-mono bg-bloomberg-bg px-3 py-2 border border-bloomberg-orange focus:outline-none focus:ring-1 focus:ring-bloomberg-orange"
                    />
                  ) : (
                    <div className="text-sm terminal-yellow font-mono bg-bloomberg-darkgray px-3 py-2 border border-bloomberg-gray">
                      {selectedUser.email}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs terminal-blue mb-1">ROLE</label>
                  {editMode ? (
                    <select
                      value={profileForm.role}
                      onChange={(e) => setProfileForm({...profileForm, role: e.target.value})}
                      className="w-full text-sm terminal-yellow font-mono bg-bloomberg-bg px-3 py-2 border border-bloomberg-orange focus:outline-none focus:ring-1 focus:ring-bloomberg-orange"
                    >
                      <option value="admin">Admin</option>
                      <option value="author">Author</option>
                    </select>
                  ) : (
                    <div className="text-sm terminal-yellow font-mono bg-bloomberg-darkgray px-3 py-2 border border-bloomberg-gray">
                      {selectedUser.role.toUpperCase()}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs terminal-blue mb-1">DISPLAY COLOR</label>
                  {editMode ? (
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={profileForm.display_color}
                        onChange={(e) => setProfileForm({...profileForm, display_color: e.target.value})}
                        className="w-12 h-8 border border-bloomberg-orange"
                      />
                      <input
                        type="text"
                        value={profileForm.display_color}
                        onChange={(e) => setProfileForm({...profileForm, display_color: e.target.value})}
                        className="flex-1 text-sm terminal-yellow font-mono bg-bloomberg-bg px-3 py-2 border border-bloomberg-orange focus:outline-none focus:ring-1 focus:ring-bloomberg-orange"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 border border-bloomberg-gray"
                        style={{ backgroundColor: selectedUser.display_color || '#00ff00' }}
                      ></div>
                      <div className="text-sm terminal-yellow font-mono bg-bloomberg-darkgray px-3 py-2 border border-bloomberg-gray flex-1">
                        {selectedUser.display_color || '#00ff00'}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs terminal-blue mb-1">STATUS</label>
                  {editMode ? (
                    <select
                      value={profileForm.is_active ? 'active' : 'inactive'}
                      onChange={(e) => setProfileForm({...profileForm, is_active: e.target.value === 'active'})}
                      className="w-full text-sm terminal-yellow font-mono bg-bloomberg-bg px-3 py-2 border border-bloomberg-orange focus:outline-none focus:ring-1 focus:ring-bloomberg-orange"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  ) : (
                    <div className={`text-sm font-mono px-3 py-2 border border-bloomberg-gray ${selectedUser.is_active ? 'terminal-green bg-bloomberg-darkgray' : 'terminal-gray bg-bloomberg-darkgray'}`}>
                      {selectedUser.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </div>
                  )}
                </div>
              </div>

              {/* User Statistics */}
              {userStats[selectedUser.id] && (
                <div className="mb-6 p-3 border border-bloomberg-gray bg-bloomberg-darkgray/30">
                  <h4 className="text-sm terminal-orange font-bold mb-2">STATISTICS</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="terminal-blue">Total Articles:</span>
                      <span className="terminal-yellow ml-2">{userStats[selectedUser.id].article_count}</span>
                    </div>
                    <div>
                      <span className="terminal-blue">Published:</span>
                      <span className="terminal-green ml-2">{userStats[selectedUser.id].published_count}</span>
                    </div>
                    <div>
                      <span className="terminal-blue">Drafts:</span>
                      <span className="terminal-gray ml-2">{userStats[selectedUser.id].draft_count}</span>
                    </div>
                    {userStats[selectedUser.id].last_activity && (
                      <div>
                        <span className="terminal-blue">Last Activity:</span>
                        <span className="terminal-orange ml-2">{formatDate(userStats[selectedUser.id].last_activity!)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <button
                      onClick={handleProfileSave}
                      disabled={saving}
                      className="flex-1 bg-bloomberg-green text-black px-4 py-2 font-mono font-bold uppercase text-sm hover:bg-green-400 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'SAVING...' : 'SAVE CHANGES'}
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="flex-1 bg-bloomberg-gray text-black px-4 py-2 font-mono font-bold uppercase text-sm hover:bg-gray-400 transition-colors"
                    >
                      CANCEL
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex-1 bg-bloomberg-orange text-black px-4 py-2 font-mono font-bold uppercase text-sm hover:bg-orange-400 transition-colors"
                    >
                      EDIT PROFILE
                    </button>
                    <button
                      onClick={() => window.open(`/user/${selectedUser.username}`, '_blank')}
                      className="flex-1 bg-bloomberg-blue text-black px-4 py-2 font-mono font-bold uppercase text-sm hover:bg-blue-400 transition-colors"
                    >
                      VIEW PUBLIC
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
}