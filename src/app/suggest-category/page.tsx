'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Vote, CheckCircle, Trash2 } from 'lucide-react';
import { generateSlug, validateSlug } from '@/lib/utils';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';

interface CategorySuggestion {
  id: number;
  name: string;
  slug: string;
  description?: string;
  color: string;
  suggested_by: number;
  suggested_by_name?: string;
  vote_count: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export default function SuggestCategoryPage() {
  const router = useRouter();
  const { authenticatedFetch } = useAuthenticatedFetch();
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [votingStates, setVotingStates] = useState<{ [key: number]: boolean }>({});
  const [deletingStates, setDeletingStates] = useState<{ [key: number]: boolean }>({});
  const [confirmDelete, setConfirmDelete] = useState<CategorySuggestion | null>(null);
  
  // Status messages
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#ff8c00');

  // Helper function for status messages
  const showStatus = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  const predefinedColors = [
    '#ff8c00', // Orange
    '#ffff00', // Yellow
    '#00ff00', // Green
    '#0080ff', // Blue
    '#ff0080', // Pink
    '#8000ff', // Purple
    '#ff4000', // Red-Orange
    '#00ff80', // Cyan
    '#ff6600', // Deep Orange
    '#80ff00', // Lime Green
    '#0040ff', // Royal Blue
    '#ff00ff', // Magenta
    '#40ff40', // Bright Green
    '#ffcc00', // Gold
    '#00ccff', // Sky Blue
    '#cc00ff', // Violet
  ];

  useEffect(() => {
    checkUserAccess();
  }, []);

  const checkUserAccess = async () => {
    try {
      const response = await authenticatedFetch('/api/auth/user-info');
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData.user);
        
        // Non-admin users can access this page
        await fetchSuggestions();
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error checking user access:', error);
      router.push('/');
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/category-suggestions');
      if (response.ok) {
        const data = await response.json();
        setSuggestions(Array.isArray(data) ? data.filter(s => s.status === 'pending') : []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setLoading(false);
    }
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    setSlug(generateSlug(newName));
  };

  const resetForm = () => {
    setName('');
    setSlug('');
    setDescription('');
    setColor('#ff8c00');
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showStatus('VALIDATION ERROR: Category name is required', 'error');
      return;
    }

    if (!validateSlug(slug.trim())) {
      showStatus('VALIDATION ERROR: Slug must contain only letters, numbers, and hyphens', 'error');
      return;
    }

    setSaving(true);

    try {
      const response = await authenticatedFetch('/api/admin/category-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
        }),
      });

      if (response.ok) {
        showStatus('CATEGORY SUGGESTION SUBMITTED SUCCESSFULLY', 'success');
        resetForm();
        await fetchSuggestions();
      } else {
        const errorData = await response.json();
        showStatus(`ERROR: ${errorData.error || 'Failed to submit suggestion'}`, 'error');
      }
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      showStatus('ERROR: Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleVote = async (suggestionId: number) => {
    setVotingStates(prev => ({ ...prev, [suggestionId]: true }));

    try {
      const response = await authenticatedFetch(`/api/admin/category-suggestions/${suggestionId}/vote`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.autoApproved) {
          showStatus(`VOTE ADDED! Category "${suggestions.find(s => s.id === suggestionId)?.name}" has been auto-approved with ${data.voteCount} votes!`, 'success');
        } else {
          showStatus('VOTE ADDED SUCCESSFULLY', 'success');
        }
        await fetchSuggestions();
      } else {
        const errorData = await response.json();
        showStatus(`ERROR: ${errorData.error || 'Failed to vote'}`, 'error');
      }
    } catch (error) {
      console.error('Error voting:', error);
      showStatus('ERROR: Network error', 'error');
    } finally {
      setVotingStates(prev => ({ ...prev, [suggestionId]: false }));
    }
  };

  const handleDeleteRequest = (suggestion: CategorySuggestion) => {
    setConfirmDelete(suggestion);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    setDeletingStates(prev => ({ ...prev, [confirmDelete.id]: true }));

    try {
      const response = await authenticatedFetch(`/api/admin/category-suggestions/${confirmDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showStatus(`Category suggestion "${confirmDelete.name}" deleted successfully`, 'success');
        await fetchSuggestions();
      } else {
        const errorData = await response.json();
        showStatus(`ERROR: ${errorData.error || 'Failed to delete suggestion'}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      showStatus('ERROR: Network error', 'error');
    } finally {
      setDeletingStates(prev => ({ ...prev, [confirmDelete.id]: false }));
      setConfirmDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setConfirmDelete(null);
  };

  if (loading) {
    return (
      <AuthenticatedLayout titlePrefix="Suggest Category" currentPage="suggest-category">
        <div className="p-8">
          <div className="terminal-orange">LOADING CATEGORY DATA...</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout titlePrefix="Suggest Category" currentPage="suggest-category">
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
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-2xl font-bold terminal-orange tracking-wider">CATEGORY SUGGESTIONS</h1>
          </div>
          <p className="terminal-green text-sm">
            Suggest new categories for the blog. Categories with 5+ votes will be automatically approved.
          </p>
        </header>

        {/* Suggest New Category */}
        <div className="bloomberg-panel mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold terminal-orange">SUGGEST NEW CATEGORY</h2>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bloomberg-button"
              >
                <Plus size={16} />
                SUGGEST CATEGORY
              </button>
            )}
          </div>

          {showForm && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold terminal-orange mb-2">CATEGORY NAME *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="bloomberg-input w-full"
                    placeholder="Enter category name..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold terminal-orange mb-2">URL SLUG *</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className={`bloomberg-input w-full font-mono ${
                      slug && !validateSlug(slug) ? 'border-red-500' : ''
                    }`}
                    placeholder="category-slug"
                  />
                  {slug && !validateSlug(slug) && (
                    <div className="text-red-400 text-xs mt-1">
                      Only letters, numbers, and hyphens allowed
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold terminal-orange mb-2">DESCRIPTION</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="bloomberg-input w-full"
                  placeholder="Brief description of this category..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold terminal-orange mb-2">COLOR</label>
                <div className="flex gap-2 flex-wrap">
                  {predefinedColors.map((colorOption) => (
                    <button
                      key={colorOption}
                      onClick={() => setColor(colorOption)}
                      className={`w-8 h-8 rounded border-2 transition-all ${
                        color === colorOption ? 'border-white scale-110' : 'border-bloomberg-gray hover:border-white'
                      }`}
                      style={{ backgroundColor: colorOption }}
                    />
                  ))}
                </div>
                <div className="mt-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-16 h-8 border border-bloomberg-gray rounded"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSubmit}
                  disabled={saving || !name.trim() || !validateSlug(slug)}
                  className="bloomberg-button disabled:opacity-50"
                >
                  {saving ? 'SUBMITTING...' : 'SUBMIT SUGGESTION'}
                </button>
                <button
                  onClick={resetForm}
                  className="terminal-orange hover:bg-bloomberg-darkgray px-4 py-2 rounded transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Current Suggestions */}
        <div className="bloomberg-panel">
          <h2 className="text-xl font-bold terminal-orange mb-4">PENDING SUGGESTIONS</h2>
          
          {suggestions.length === 0 ? (
            <div className="text-center py-8 terminal-yellow">
              NO PENDING SUGGESTIONS
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="bloomberg-table w-full">
                <thead>
                  <tr>
                    <th>CATEGORY</th>
                    <th>DESCRIPTION</th>
                    <th>SUGGESTED BY</th>
                    <th>VOTES</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((suggestion) => (
                    <tr key={suggestion.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: suggestion.color }}
                          />
                          <div>
                            <div className="font-bold">{suggestion.name}</div>
                            <div className="text-xs terminal-green">{suggestion.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">
                          {suggestion.description || 'No description'}
                        </div>
                      </td>
                      <td>
                        <div className="text-sm terminal-blue">
                          {suggestion.suggested_by_name?.toUpperCase() || 'UNKNOWN'}
                        </div>
                      </td>
                      <td>
                        <div className="text-center">
                          <span className="terminal-green font-bold">{suggestion.vote_count}</span>
                          <span className="text-xs terminal-yellow"> / 5</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVote(suggestion.id)}
                            disabled={votingStates[suggestion.id]}
                            className="flex items-center gap-1 text-xs terminal-orange hover:bg-bloomberg-darkgray px-2 py-1 rounded transition-colors disabled:opacity-50"
                          >
                            <Vote size={12} />
                            {votingStates[suggestion.id] ? 'VOTING...' : 'VOTE'}
                          </button>
                          {currentUser && suggestion.suggested_by === currentUser.id && suggestion.status === 'pending' && (
                            <button
                              onClick={() => handleDeleteRequest(suggestion)}
                              disabled={deletingStates[suggestion.id]}
                              className="flex items-center gap-1 text-xs text-red-400 hover:bg-red-500/20 px-2 py-1 rounded transition-colors disabled:opacity-50"
                            >
                              <Trash2 size={12} />
                              {deletingStates[suggestion.id] ? 'DELETING...' : 'DELETE'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={handleDeleteCancel}>
            <div className="max-w-md bg-black border border-red-500 rounded p-6" onClick={e => e.stopPropagation()}>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-red-400 mb-2">DELETE SUGGESTION</h3>
                <p className="text-sm terminal-gray mb-2">
                  Are you sure you want to delete the category suggestion:
                </p>
                <p className="text-sm terminal-yellow font-bold">
                  &quot;{confirmDelete.name.toUpperCase()}&quot;
                </p>
                <p className="text-xs text-red-400 mt-2">
                  This action cannot be undone and will remove all votes.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteCancel}
                  className="flex-1 py-2 px-4 border border-bloomberg-gray text-bloomberg-gray hover:bg-bloomberg-darkgray transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deletingStates[confirmDelete.id]}
                  className="flex-1 py-2 px-4 bg-red-500 text-black hover:bg-red-400 transition-colors disabled:opacity-50"
                >
                  {deletingStates[confirmDelete.id] ? 'DELETING...' : 'DELETE'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}