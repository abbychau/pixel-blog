'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Eye } from 'lucide-react';
import { generateSlug, validateSlug, generateDateSuffix } from '@/lib/utils';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';

interface Category {
  id: number;
  name: string;
  slug: string;
  color?: string;
}

export default function CreateArticlePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Status messages
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  const { authenticatedFetch } = useAuthenticatedFetch();

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/categories');
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setLoading(false);
    }
  };

  // Helper function for status messages
  const showStatus = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setSlug(generateSlug(newTitle));
  };

  const handlePreview = () => {
    if (!title.trim() || !content.trim()) {
      showStatus('VALIDATION ERROR: Title and content are required for preview', 'error');
      return;
    }
    
    const previewData = {
      title: title.trim(),
      slug: slug.trim() || 'preview-article',
      content: content.trim(),
      excerpt: excerpt.trim(),
      category_name: categories.find(c => c.id === categoryId)?.name,
      category_color: categories.find(c => c.id === categoryId)?.color,
      author_name: 'Preview User',
      author_color: '#0080ff',
      status: status,
      published_at: status === 'published' ? new Date().toISOString() : null,
      created_at: new Date().toISOString()
    };
    
    sessionStorage.setItem('previewData', JSON.stringify(previewData));
    window.open('/preview', '_blank');
  };

  const uploadImage = async (file: File): Promise<string> => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await authenticatedFetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }
      
      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleImagePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image/') === 0) {
        event.preventDefault();
        
        const file = item.getAsFile();
        if (!file) continue;

        const textarea = event.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const uploadingText = '[Uploading image...]';
        
        // Show uploading text in textarea immediately
        const contentBeforeUpload = content.substring(0, start) + uploadingText + content.substring(end);
        setContent(contentBeforeUpload);
        
        // Set cursor position after the uploading text
        setTimeout(() => {
          textarea.setSelectionRange(start + uploadingText.length, start + uploadingText.length);
          textarea.focus();
        }, 0);

        try {
          const imageUrl = await uploadImage(file);
          const imageMarkdown = `![Image](${imageUrl})`;
          
          // Replace the uploading text with actual image markdown
          const finalContent = contentBeforeUpload.replace('[Uploading image...]', imageMarkdown);
          setContent(finalContent);
          
          // Set cursor position after the inserted image
          setTimeout(() => {
            const newCursorPos = start + imageMarkdown.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            textarea.focus();
          }, 0);
        } catch (error) {
          // Remove the uploading text on error
          const errorContent = contentBeforeUpload.replace('[Uploading image...]', '[Image upload failed]');
          setContent(errorContent);
        }
        break;
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      showStatus('VALIDATION ERROR: Title and content are required', 'error');
      return;
    }

    if (slug.trim() && !validateSlug(slug.trim())) {
      showStatus('VALIDATION ERROR: Slug must contain only letters, numbers, and hyphens', 'error');
      return;
    }

    setSaving(true);

    try {
      const response = await authenticatedFetch('/api/admin/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || null,
          content: content.trim(),
          excerpt: excerpt.trim() || null,
          category_id: categoryId || null,
          status,
          published_at: status === 'published' ? new Date().toISOString() : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showStatus('ARTICLE CREATED SUCCESSFULLY - Redirecting to edit page...', 'success');
        
        // Redirect to edit page after a short delay to show the success message
        setTimeout(() => {
          router.push(`/edit/${data.id}`);
        }, 1500);
        
        // Don't reset saving state to prevent form resubmission
        return;
      } else {
        const errorData = await response.json();
        
        // Handle slug already exists error
        if (errorData.error === 'Slug already exists') {
          const originalSlug = slug.trim();
          const newSlug = `${originalSlug}-${generateDateSuffix()}`;
          setSlug(newSlug);
          showStatus(`SLUG CONFLICT: "${originalSlug}" already exists. Suggested slug: "${newSlug}". Please try again.`, 'error');
        } else {
          showStatus(`ERROR: ${errorData.error || 'Failed to create article'}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error creating article:', error);
      showStatus('ERROR: Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout currentPage="create">
        <div className="p-8">
          <div className="terminal-orange">LOADING SYSTEM DATA...</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout titlePrefix="Create Article" currentPage="create">
      <div className="p-8">

        {/* Form */}
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-bold terminal-orange mb-2">TITLE *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="bloomberg-input w-full"
                  placeholder="Enter article title..."
                />
              </div>


              {/* Content */}
              <div>
                <label className="block text-sm font-bold terminal-orange mb-2">CONTENT *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onPaste={handleImagePaste}
                  rows={20}
                  className="bloomberg-input w-full font-mono resize-y"
                  placeholder="# Article Title

Write your article content here using Markdown syntax...
Paste images directly from clipboard!

## Subheading

Your content goes here."
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-bold terminal-orange mb-2">EXCERPT</label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                  className="bloomberg-input w-full"
                  placeholder="Brief description for article preview..."
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions */}
              <div className="bloomberg-panel">
                <h3 className="text-lg font-bold terminal-orange mb-4">ACTIONS</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bloomberg-button disabled:opacity-50"
                  >
                    <Save size={16} />
                    {saving ? 'CREATING...' : 'CREATE ARTICLE'}
                  </button>
                  <button
                    onClick={handlePreview}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-bloomberg-blue text-bloomberg-blue hover:bg-bloomberg-blue hover:text-black transition-colors"
                  >
                    <Eye size={16} />
                    PREVIEW ARTICLE
                  </button>
                </div>
              </div>

              {/* Publication Settings */}
              <div className="bloomberg-panel">
                <h3 className="text-lg font-bold terminal-orange mb-4">PUBLICATION</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold terminal-orange mb-2">STATUS</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                      className="bloomberg-input w-full"
                    >
                      <option value="draft">DRAFT</option>
                      <option value="published">PUBLISHED</option>
                    </select>
                    <div className="text-xs terminal-green mt-1">
                      {status === 'draft' ? 'Article will be saved as draft' : 'Article will be published immediately'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold terminal-orange mb-2">CATEGORY</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : '')}
                      className="bloomberg-input w-full"
                    >
                      <option value="">-- SELECT CATEGORY --</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* URL Slug */}
              <div className="bloomberg-panel">
                <h3 className="text-lg font-bold terminal-orange mb-4">URL SLUG</h3>
                <div>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      const newSlug = e.target.value;
                      setSlug(newSlug);
                    }}
                    className={`bloomberg-input w-full font-mono ${
                      slug && !validateSlug(slug) ? 'border-red-500' : ''
                    }`}
                    placeholder="article-url-slug"
                  />
                  <div className="text-xs mt-1">
                    <div className="terminal-green">URL: /article/{slug || 'article-id'}</div>
                    {slug && !validateSlug(slug) && (
                      <div className="text-red-400 mt-1">
                        Only letters, numbers, and hyphens allowed
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Help */}
              <div className="bloomberg-panel">
                <h3 className="text-lg font-bold terminal-orange mb-4">MARKDOWN HELP</h3>
                <div className="text-xs space-y-1 terminal-green">
                  <div># Heading 1</div>
                  <div>## Heading 2</div>
                  <div>### Heading 3</div>
                  <div>**Bold text**</div>
                  <div>*Italic text*</div>
                  <div>[Link](url)</div>
                </div>
                <div className="mt-3 pt-3 border-t border-bloomberg-gray">
                  <a 
                    href="https://www.markdownguide.org/basic-syntax/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs terminal-blue hover:terminal-orange transition-colors underline"
                  >
                    VIEW FULL MARKDOWN GUIDE →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}