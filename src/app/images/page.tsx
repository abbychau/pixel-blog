'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, Eye, Download, Image as ImageIcon, HardDrive, Clock, User, ExternalLink } from 'lucide-react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { formatDate } from '@/lib/utils';

interface ImageFile {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  width?: number;
  height?: number;
  url: string;
  uploaded_by: number;
  used_in_articles: number[];
  article_details?: Array<{
    id: number;
    title: string;
    slug: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface ImageStats {
  totalImages: number;
  totalSize: number;
  averageSize: number;
  totalSizeMB: string;
}

export default function ImagesPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [stats, setStats] = useState<ImageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  const [confirmDelete, setConfirmDelete] = useState<ImageFile | null>(null);
  
  const { authenticatedFetch } = useAuthenticatedFetch();

  useEffect(() => {
    fetchImages();
    fetchStats();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/images');
      if (response.ok) {
        const data = await response.json();
        setImages(data);
      } else {
        showStatus('Failed to fetch images', 'error');
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      showStatus('Error fetching images', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/images/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const showStatus = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  const handleDeleteRequest = (image: ImageFile) => {
    if (image.used_in_articles.length > 0) {
      showStatus(`Cannot delete image: used in ${image.used_in_articles.length} article(s)`, 'error');
      return;
    }
    setConfirmDelete(image);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    setDeleting(confirmDelete.id);
    try {
      const response = await authenticatedFetch(`/api/admin/images?id=${confirmDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setImages(images.filter(img => img.id !== confirmDelete.id));
        showStatus('Image deleted successfully', 'success');
        fetchStats(); // Refresh stats
      } else {
        const errorData = await response.json();
        showStatus(errorData.error || 'Failed to delete image', 'error');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      showStatus('Error deleting image', 'error');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setConfirmDelete(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadImage = async (image: ImageFile) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = image.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showStatus('Image downloaded', 'success');
    } catch (error) {
      console.error('Error downloading image:', error);
      showStatus('Error downloading image', 'error');
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout titlePrefix="Images" currentPage="images">
        <div className="p-8">
          <div className="terminal-orange">LOADING IMAGE GALLERY...</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout titlePrefix="Images" currentPage="images">
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

        <div className="mb-6 font-mono">
          <div className="flex items-center gap-2 text-sm">
            <span className="terminal-green">$</span>
            <span className="terminal-orange">ls</span>
            <span className="terminal-blue">-la</span>
            <span className="terminal-yellow">/images</span>
          </div>
          <div className="text-xs terminal-gray mt-1">
            {images.length} images • {stats?.totalSizeMB}MB total • last uploaded: {images[0] ? formatDate(images[0].created_at) : 'never'}
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bloomberg-panel">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon size={16} className="terminal-orange" />
                <span className="text-sm font-bold terminal-orange">TOTAL IMAGES</span>
              </div>
              <div className="text-2xl font-bold terminal-yellow">{stats.totalImages}</div>
            </div>
            
            <div className="bloomberg-panel">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={16} className="terminal-blue" />
                <span className="text-sm font-bold terminal-orange">STORAGE USED</span>
              </div>
              <div className="text-2xl font-bold terminal-green">{stats.totalSizeMB}MB</div>
            </div>
            
            <div className="bloomberg-panel">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="terminal-green" />
                <span className="text-sm font-bold terminal-orange">AVG SIZE</span>
              </div>
              <div className="text-2xl font-bold terminal-blue">{formatFileSize(stats.averageSize)}</div>
            </div>
            
            <div className="bloomberg-panel">
              <div className="flex items-center gap-2 mb-2">
                <User size={16} className="terminal-yellow" />
                <span className="text-sm font-bold terminal-orange">COMPRESSION</span>
              </div>
              <div className="text-2xl font-bold terminal-green">~70%</div>
            </div>
          </div>
        )}

        {/* Image Gallery */}
        <div className="bloomberg-panel">
          <div className="flex justify-between items-center mb-6 border-b border-bloomberg-gray pb-2">
            <h2 className="text-lg font-bold terminal-orange tracking-wider font-mono flex items-center gap-2">
              <ImageIcon size={20} />
              IMAGE GALLERY
            </h2>
            <div className="text-xs terminal-gray">
              [{images.length} files]
            </div>
          </div>

          {images.length === 0 ? (
            <div className="text-center py-12 terminal-gray">
              <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
              <div>No images uploaded yet.</div>
              <div className="text-xs mt-2">Images will appear here when you paste them in articles.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {images.map((image) => (
                <div key={image.id} className="border border-bloomberg-gray rounded bg-black/30 p-3 hover:bg-bloomberg-darkgray/30 transition-colors">
                  {/* Image Preview */}
                  <div className="aspect-square mb-3 bg-bloomberg-darkgray rounded overflow-hidden">
                    <Image
                      src={image.url}
                      alt={image.original_filename}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImage(image)}
                    />
                  </div>

                  {/* Image Info */}
                  <div className="space-y-2 text-xs">
                    <div className="font-bold terminal-yellow truncate" title={image.original_filename}>
                      {image.original_filename}
                    </div>
                    
                    <div className="flex justify-between text-terminal-gray">
                      <span>{formatFileSize(image.file_size)}</span>
                      <span>{image.width}×{image.height}</span>
                    </div>
                    
                    <div className="text-terminal-gray">
                      {formatDate(image.created_at)}
                    </div>

                    {image.article_details && image.article_details.length > 0 && (
                      <div className="text-xs">
                        <div className="text-terminal-green mb-1">
                          Used in {image.article_details.length} article{image.article_details.length !== 1 ? 's' : ''}:
                        </div>
                        <div className="space-y-1">
                          {image.article_details.map((article) => (
                            <Link
                              key={article.id}
                              href={`/article/${article.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-terminal-blue hover:text-terminal-orange transition-colors text-xs truncate"
                              title={article.title}
                            >
                              <ExternalLink size={10} />
                              {article.title}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-1 pt-2">
                      <button
                        onClick={() => setSelectedImage(image)}
                        className="flex-1 flex items-center justify-center gap-1 py-1 px-2 text-xs border border-bloomberg-blue text-bloomberg-blue hover:bg-bloomberg-blue hover:text-black transition-colors"
                        title="View"
                      >
                        <Eye size={12} />
                      </button>
                      
                      <button
                        onClick={() => downloadImage(image)}
                        className="flex-1 flex items-center justify-center gap-1 py-1 px-2 text-xs border border-bloomberg-green text-bloomberg-green hover:bg-bloomberg-green hover:text-black transition-colors"
                        title="Download"
                      >
                        <Download size={12} />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteRequest(image)}
                        disabled={deleting === image.id || image.used_in_articles.length > 0}
                        className="flex-1 flex items-center justify-center gap-1 py-1 px-2 text-xs border border-red-500 text-red-400 hover:bg-red-500 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={image.used_in_articles.length > 0 ? 'Cannot delete: used in articles' : 'Delete'}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
            <div className="max-w-4xl max-h-full bg-black border border-bloomberg-orange rounded p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold terminal-orange">{selectedImage.original_filename}</h3>
                  <div className="text-sm terminal-gray mt-1">
                    {formatFileSize(selectedImage.file_size)} • {selectedImage.width}×{selectedImage.height} • {formatDate(selectedImage.created_at)}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="terminal-orange hover:terminal-red text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="max-h-96 overflow-auto">
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.original_filename}
                  width={selectedImage.width || 800}
                  height={selectedImage.height || 600}
                  className="max-w-full h-auto mx-auto block"
                />
              </div>
              
              <div className="mt-4 pt-4 border-t border-bloomberg-gray">
                <div className="text-xs space-y-1">
                  <div><span className="terminal-orange">URL:</span> <span className="terminal-blue font-mono text-xs break-all">{selectedImage.url}</span></div>
                  <div><span className="terminal-orange">Type:</span> <span className="terminal-green">{selectedImage.file_type}</span></div>
                  <div><span className="terminal-orange">Filename:</span> <span className="terminal-yellow font-mono">{selectedImage.filename}</span></div>
                  {selectedImage.article_details && selectedImage.article_details.length > 0 && (
                    <div>
                      <span className="terminal-orange">Used in articles:</span>
                      <div className="mt-1 space-y-1">
                        {selectedImage.article_details.map((article) => (
                          <Link
                            key={article.id}
                            href={`/article/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-terminal-blue hover:text-terminal-orange transition-colors text-xs"
                          >
                            <ExternalLink size={12} />
                            {article.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={handleDeleteCancel}>
            <div className="max-w-md bg-black border border-red-500 rounded p-6" onClick={e => e.stopPropagation()}>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-red-400 mb-2">DELETE IMAGE</h3>
                <p className="text-sm terminal-gray mb-2">
                  Are you sure you want to delete:
                </p>
                <p className="text-sm terminal-yellow font-mono break-all">
                  &quot;{confirmDelete.original_filename}&quot;
                </p>
                <p className="text-xs text-red-400 mt-2">
                  This action cannot be undone.
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
                  disabled={deleting === confirmDelete.id}
                  className="flex-1 py-2 px-4 bg-red-500 text-black hover:bg-red-400 transition-colors disabled:opacity-50"
                >
                  {deleting === confirmDelete.id ? 'DELETING...' : 'DELETE'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}