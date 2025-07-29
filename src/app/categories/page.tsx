'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Edit, Trash2, Vote, CheckCircle, XCircle } from 'lucide-react';
import { generateSlug } from '@/lib/utils';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import * as Dialog from '@radix-ui/react-dialog';

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  color: string;
  created_at: string;
  updated_at: string;
}

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

export default function CategoriesPage() {
  const router = useRouter();
  const { authenticatedFetch } = useAuthenticatedFetch();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'categories' | 'suggestions'>('categories');
  const [approvalThreshold, setApprovalThreshold] = useState(5);
  const [tempThreshold, setTempThreshold] = useState(5);
  const [updatingThreshold, setUpdatingThreshold] = useState(false);
  
  // Status messages
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#ff8c00');

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
    checkUserRole();
  }, []);

  // Helper functions for status messages
  const showStatus = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  const showDialog = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  }) => {
    setDialogConfig(config);
    setDialogOpen(true);
  };

  const checkUserRole = async () => {
    try {
      // Get current user info to check role
      const response = await authenticatedFetch('/api/auth/user-info');
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData.user);
        
        // Check if user is admin
        if (userData.user.role !== 'admin') {
          showStatus('ACCESS DENIED: ADMIN ROLE REQUIRED FOR CATEGORY MANAGEMENT', 'error');
          router.push('/');
          return;
        }
        
        // If admin, fetch categories, suggestions, and system settings
        await Promise.all([fetchCategories(), fetchSuggestions(), fetchSystemSettings()]);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      router.push('/');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/categories');
      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setCategories(data);
      } else {
        console.error('Error: Response is not an array:', data);
        setCategories([]);
        showStatus('ERROR: Invalid response format from server', 'error');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/category-suggestions');
      if (response.ok) {
        const data = await response.json();
        // Admin sees all suggestions (pending, approved, rejected)
        setSuggestions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/system-settings');
      if (response.ok) {
        const settings = await response.json();
        const thresholdSetting = settings.find((s: any) => s.key === 'category_approval_threshold');
        if (thresholdSetting) {
          const threshold = parseInt(thresholdSetting.value);
          setApprovalThreshold(threshold);
          setTempThreshold(threshold);
        }
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
  };

  const updateApprovalThreshold = async (newThreshold: number) => {
    setUpdatingThreshold(true);
    try {
      const response = await authenticatedFetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'category_approval_threshold',
          value: newThreshold.toString(),
        }),
      });

      if (response.ok) {
        setApprovalThreshold(newThreshold);
        setTempThreshold(newThreshold);
        showStatus('APPROVAL THRESHOLD UPDATED SUCCESSFULLY', 'success');
      } else {
        const errorData = await response.json();
        showStatus(`ERROR: ${errorData.error || 'Failed to update threshold'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating threshold:', error);
      showStatus('ERROR: Network error', 'error');
    } finally {
      setUpdatingThreshold(false);
    }
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    if (!editingCategory) {
      setSlug(generateSlug(newName));
    }
  };

  const resetForm = () => {
    setName('');
    setSlug('');
    setDescription('');
    setColor('#ff8c00');
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setSlug(category.slug);
    setDescription(category.description || '');
    setColor(category.color);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      showStatus('VALIDATION ERROR: Name and slug are required', 'error');
      return;
    }

    setSaving(true);

    try {
      const url = editingCategory 
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await authenticatedFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          color: color,
        }),
      });

      if (response.ok) {
        showStatus(editingCategory ? 'CATEGORY UPDATED SUCCESSFULLY' : 'CATEGORY CREATED SUCCESSFULLY', 'success');
        resetForm();
        fetchCategories();
      } else {
        const errorData = await response.json();
        showStatus(`ERROR: ${errorData.error || 'Failed to save category'}`, 'error');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      showStatus('ERROR: Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    showDialog({
      title: 'DELETE CATEGORY',
      message: `Delete category "${name}"?\n\nThis action cannot be undone and may affect existing articles.`,
      onConfirm: () => performDeleteCategory(id, name),
      confirmText: 'DELETE',
      cancelText: 'CANCEL'
    });
  };

  const performDeleteCategory = async (id: number, name: string) => {

    try {
      const response = await authenticatedFetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showStatus('CATEGORY DELETED SUCCESSFULLY', 'success');
        fetchCategories();
      } else {
        const errorData = await response.json();
        showStatus(`ERROR: ${errorData.error || 'Failed to delete category'}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      showStatus('ERROR: Network error', 'error');
    }
  };

  const handleApproveSuggestion = async (id: number, name: string) => {
    showDialog({
      title: 'APPROVE CATEGORY SUGGESTION',
      message: `Approve category suggestion "${name}"?\n\nThis will create a new category.`,
      onConfirm: () => performApproveSuggestion(id, name),
      confirmText: 'APPROVE',
      cancelText: 'CANCEL'
    });
  };

  const performApproveSuggestion = async (id: number, name: string) => {

    try {
      const response = await authenticatedFetch(`/api/admin/category-suggestions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (response.ok) {
        showStatus('CATEGORY SUGGESTION APPROVED AND CREATED SUCCESSFULLY', 'success');
        await Promise.all([fetchCategories(), fetchSuggestions()]);
      } else {
        const errorData = await response.json();
        showStatus(`ERROR: ${errorData.error || 'Failed to approve suggestion'}`, 'error');
      }
    } catch (error) {
      console.error('Error approving suggestion:', error);
      showStatus('ERROR: Network error', 'error');
    }
  };

  const handleRejectSuggestion = async (id: number, name: string) => {
    showDialog({
      title: 'REJECT CATEGORY SUGGESTION',
      message: `Reject category suggestion "${name}"?\n\nThis action cannot be undone.`,
      onConfirm: () => performRejectSuggestion(id, name),
      confirmText: 'REJECT',
      cancelText: 'CANCEL'
    });
  };

  const performRejectSuggestion = async (id: number, name: string) => {

    try {
      const response = await authenticatedFetch(`/api/admin/category-suggestions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (response.ok) {
        showStatus('CATEGORY SUGGESTION REJECTED SUCCESSFULLY', 'success');
        fetchSuggestions();
      } else {
        const errorData = await response.json();
        showStatus(`ERROR: ${errorData.error || 'Failed to reject suggestion'}`, 'error');
      }
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      showStatus('ERROR: Network error', 'error');
    }
  };

  const handleDeleteSuggestion = async (id: number, name: string) => {
    showDialog({
      title: 'DELETE CATEGORY SUGGESTION',
      message: `Delete category suggestion "${name}"?\n\nThis action cannot be undone.`,
      onConfirm: () => performDeleteSuggestion(id, name),
      confirmText: 'DELETE',
      cancelText: 'CANCEL'
    });
  };

  const performDeleteSuggestion = async (id: number, name: string) => {

    try {
      const response = await authenticatedFetch(`/api/admin/category-suggestions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showStatus('CATEGORY SUGGESTION DELETED SUCCESSFULLY', 'success');
        fetchSuggestions();
      } else {
        const errorData = await response.json();
        showStatus(`ERROR: ${errorData.error || 'Failed to delete suggestion'}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      showStatus('ERROR: Network error', 'error');
    }
  };

  return (
    <AuthenticatedLayout requireAdmin={true} titlePrefix="Categories" currentPage="categories">
      <div className="p-8">
        {/* Status Message */}
        {statusMessage && (
          <div className={`mb-4 p-3 rounded border ${
            statusType === 'success' 
              ? 'bg-green-500/10 border-green-500 text-green-400'
              : statusType === 'error'
              ? 'bg-red-500/10 border-red-500 text-red-400'
              : 'bg-blue-500/10 border-blue-500 text-blue-400'
          }`}>
            {statusMessage}
          </div>
        )}

      {/* Main Content */}
      <main>
        <div className="bloomberg-panel">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold terminal-orange tracking-wider">CATEGORY DATABASE</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bloomberg-button"
            >
              <Plus size={16} />
              {showForm ? 'CANCEL' : 'CREATE CATEGORY'}
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded transition-colors ${
                activeTab === 'categories'
                  ? 'bloomberg-button'
                  : 'terminal-orange hover:bg-bloomberg-darkgray'
              }`}
            >
              CATEGORIES
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`px-4 py-2 rounded transition-colors ${
                activeTab === 'suggestions'
                  ? 'bloomberg-button'
                  : 'terminal-orange hover:bg-bloomberg-darkgray'
              }`}
            >
              SUGGESTIONS ({suggestions.filter(s => s.status === 'pending').length})
            </button>
          </div>

          {/* Create/Edit Form */}
          {showForm && activeTab === 'categories' && (
            <div className="mb-8 p-6 border border-bloomberg-gray rounded bg-bloomberg-darkgray">
              <h3 className="text-lg font-bold terminal-orange mb-4">
                {editingCategory ? 'EDIT CATEGORY' : 'CREATE NEW CATEGORY'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold terminal-orange mb-2">NAME *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="bloomberg-input w-full"
                      placeholder="Category name..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold terminal-orange mb-2">SLUG *</label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="bloomberg-input w-full font-mono"
                      placeholder="category-slug"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold terminal-orange mb-2">DESCRIPTION</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="bloomberg-input w-full"
                      placeholder="Category description..."
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold terminal-orange mb-2">COLOR</label>
                    <div className="flex gap-2 mb-2">
                      {predefinedColors.map((presetColor) => (
                        <button
                          key={presetColor}
                          onClick={() => setColor(presetColor)}
                          className={`w-8 h-8 rounded border-2 ${color === presetColor ? 'border-white' : 'border-gray-600'}`}
                          style={{ backgroundColor: presetColor }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full h-10"
                    />
                  </div>

                  <div className="p-4 border border-bloomberg-gray rounded">
                    <div className="text-sm terminal-orange mb-2">PREVIEW:</div>
                    <div 
                      className="px-2 py-1 text-xs font-bold rounded inline-block"
                      style={{ color: color }}
                    >
                      {name.toUpperCase() || 'CATEGORY NAME'}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 bloomberg-button disabled:opacity-50"
                    >
                      {saving ? 'SAVING...' : (editingCategory ? 'UPDATE' : 'CREATE')}
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

          {/* Categories List */}
          {activeTab === 'categories' && (
            loading ? (
              <div className="terminal-orange">LOADING CATEGORY DATABASE...</div>
            ) : (
            <div className="overflow-x-auto">
              <table className="bloomberg-table w-full">
                <thead>
                  <tr>
                    <th className="w-16">ID</th>
                    <th className="text-left">NAME</th>
                    <th className="w-32">SLUG</th>
                    <th className="text-left">DESCRIPTION</th>
                    <th className="w-24">COLOR</th>
                    <th className="w-32">CREATED</th>
                    <th className="w-32">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className="font-mono terminal-blue">
                        {String(category.id).padStart(3, '0')}
                      </td>
                      <td className="font-bold">
                        {category.name}
                      </td>
                      <td className="font-mono text-xs">
                        {category.slug}
                      </td>
                      <td className="text-sm">
                        {category.description || <span className="terminal-gray">No description</span>}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border border-gray-600"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-xs font-mono">{category.color}</span>
                        </div>
                      </td>
                      <td className="text-center font-mono text-xs">
                        {new Date(category.created_at).toLocaleDateString()}
                      </td>
                      <td className="text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEdit(category)}
                            className="p-1 terminal-orange hover:bg-bloomberg-darkgray rounded transition-colors"
                            title="Edit Category"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(category.id, category.name)}
                            className="p-1 text-red-500 hover:bg-bloomberg-darkgray rounded transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {categories.length === 0 && (
                <div className="text-center py-8 terminal-yellow">
                  NO CATEGORIES FOUND IN DATABASE
                  <br />
                  <button 
                    onClick={() => setShowForm(true)}
                    className="terminal-orange hover:underline"
                  >
                    CREATE YOUR FIRST CATEGORY
                  </button>
                </div>
              )}
            </div>
            )
          )}

          {/* Suggestions Management */}
          {activeTab === 'suggestions' && (
            <div className="space-y-6">
              {/* System Settings */}
              <div className="bloomberg-panel p-4">
                <h3 className="text-lg font-bold terminal-orange mb-4">SYSTEM SETTINGS</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-bold terminal-orange">APPROVAL THRESHOLD:</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={tempThreshold}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        if (value >= 1 && value <= 100) {
                          setTempThreshold(value);
                        }
                      }}
                      onBlur={() => {
                        if (tempThreshold !== approvalThreshold) {
                          updateApprovalThreshold(tempThreshold);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      disabled={updatingThreshold}
                      className="bloomberg-input w-20 text-center"
                    />
                    <span className="text-sm terminal-green">votes for auto-approval</span>
                    {tempThreshold !== approvalThreshold && !updatingThreshold && (
                      <button
                        onClick={() => updateApprovalThreshold(tempThreshold)}
                        className="text-xs terminal-orange hover:underline"
                      >
                        SAVE
                      </button>
                    )}
                  </div>
                  {updatingThreshold && (
                    <div className="text-xs terminal-yellow">UPDATING...</div>
                  )}
                </div>
              </div>
              {/* Pending Suggestions */}
              <div>
                <h3 className="text-lg font-bold terminal-orange mb-4">PENDING SUGGESTIONS</h3>
                {suggestions.filter(s => s.status === 'pending').length === 0 ? (
                  <div className="text-center py-8 terminal-yellow">
                    NO PENDING SUGGESTIONS
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="bloomberg-table w-full">
                      <thead>
                        <tr>
                          <th className="w-16">ID</th>
                          <th className="text-left">CATEGORY</th>
                          <th className="text-left">DESCRIPTION</th>
                          <th className="w-32">SUGGESTED BY</th>
                          <th className="w-24">VOTES</th>
                          <th className="w-32">CREATED</th>
                          <th className="w-48">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suggestions.filter(s => s.status === 'pending').map((suggestion) => (
                          <tr key={suggestion.id}>
                            <td className="font-mono terminal-blue">
                              {String(suggestion.id).padStart(3, '0')}
                            </td>
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
                            <td className="text-sm">
                              {suggestion.description || <span className="terminal-gray">No description</span>}
                            </td>
                            <td className="text-center text-sm terminal-blue">
                              {suggestion.suggested_by_name?.toUpperCase() || 'UNKNOWN'}
                            </td>
                            <td className="text-center">
                              <span className="terminal-green font-bold">{suggestion.vote_count}</span>
                              <span className="text-xs terminal-yellow"> / {approvalThreshold}</span>
                            </td>
                            <td className="text-center font-mono text-xs">
                              {new Date(suggestion.created_at).toLocaleDateString()}
                            </td>
                            <td className="text-center">
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => handleApproveSuggestion(suggestion.id, suggestion.name)}
                                  className="flex items-center gap-1 p-1 text-xs terminal-green hover:bg-bloomberg-darkgray rounded transition-colors"
                                  title="Approve Suggestion"
                                >
                                  <CheckCircle size={14} />
                                  APPROVE
                                </button>
                                <button
                                  onClick={() => handleRejectSuggestion(suggestion.id, suggestion.name)}
                                  className="flex items-center gap-1 p-1 text-xs text-red-500 hover:bg-bloomberg-darkgray rounded transition-colors"
                                  title="Reject Suggestion"
                                >
                                  <XCircle size={14} />
                                  REJECT
                                </button>
                                <button
                                  onClick={() => handleDeleteSuggestion(suggestion.id, suggestion.name)}
                                  className="p-1 text-red-500 hover:bg-bloomberg-darkgray rounded transition-colors"
                                  title="Delete Suggestion"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Approved/Rejected Suggestions */}
              <div>
                <h3 className="text-lg font-bold terminal-orange mb-4">PROCESSED SUGGESTIONS</h3>
                {suggestions.filter(s => s.status !== 'pending').length === 0 ? (
                  <div className="text-center py-8 terminal-yellow">
                    NO PROCESSED SUGGESTIONS
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="bloomberg-table w-full">
                      <thead>
                        <tr>
                          <th className="w-16">ID</th>
                          <th className="text-left">CATEGORY</th>
                          <th className="w-32">SUGGESTED BY</th>
                          <th className="w-24">VOTES</th>
                          <th className="w-24">STATUS</th>
                          <th className="w-32">PROCESSED</th>
                          <th className="w-24">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suggestions.filter(s => s.status !== 'pending').map((suggestion) => (
                          <tr key={suggestion.id}>
                            <td className="font-mono terminal-blue">
                              {String(suggestion.id).padStart(3, '0')}
                            </td>
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
                            <td className="text-center text-sm terminal-blue">
                              {suggestion.suggested_by_name?.toUpperCase() || 'UNKNOWN'}
                            </td>
                            <td className="text-center">
                              <span className="terminal-green font-bold">{suggestion.vote_count}</span>
                            </td>
                            <td className="text-center">
                              <span className={`px-2 py-1 text-xs font-bold rounded ${
                                suggestion.status === 'approved' 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {suggestion.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="text-center font-mono text-xs">
                              {new Date(suggestion.updated_at).toLocaleDateString()}
                            </td>
                            <td className="text-center">
                              <button
                                onClick={() => handleDeleteSuggestion(suggestion.id, suggestion.name)}
                                className="p-1 text-red-500 hover:bg-bloomberg-darkgray rounded transition-colors"
                                title="Delete Suggestion"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      </div>

      {/* Confirmation Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md p-6 bg-bloomberg-darkgray border border-bloomberg-gray rounded shadow-lg">
            {dialogConfig && (
              <>
                <Dialog.Title className="text-lg font-bold terminal-orange mb-4">
                  {dialogConfig.title}
                </Dialog.Title>
                <Dialog.Description className="text-sm terminal-green mb-6 whitespace-pre-line">
                  {dialogConfig.message}
                </Dialog.Description>
                <div className="flex gap-3 justify-end">
                  <Dialog.Close asChild>
                    <button className="px-4 py-2 border border-bloomberg-gray text-bloomberg-gray hover:bg-bloomberg-gray hover:text-black transition-colors rounded">
                      {dialogConfig.cancelText || 'CANCEL'}
                    </button>
                  </Dialog.Close>
                  <Dialog.Close asChild>
                    <button
                      onClick={dialogConfig.onConfirm}
                      className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors rounded"
                    >
                      {dialogConfig.confirmText || 'CONFIRM'}
                    </button>
                  </Dialog.Close>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </AuthenticatedLayout>
  );
}