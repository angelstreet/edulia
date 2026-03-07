import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '../../../components/ui/Spinner';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { getFiles, getCategories, uploadFile, deleteFile, type FileData, type CategoryCount } from '../../../api/files';
import { useCurrentUser } from '../../../hooks/useCurrentUser';

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'administrative', label: 'Administratif' },
  { key: 'school_life', label: 'Vie Scolaire' },
  { key: 'grades', label: 'Notes' },
  { key: 'invoices', label: 'Factures' },
  { key: 'enrollment', label: 'Inscription' },
  { key: 'general', label: 'Général' },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const isAdmin = user?.role === 'admin';
  const [files, setFiles] = useState<FileData[]>([]);
  const [counts, setCounts] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('general');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const [filesRes, countsRes] = await Promise.all([
        getFiles({ category: activeTab || undefined }),
        getCategories(),
      ]);
      setFiles(Array.isArray(filesRes.data) ? filesRes.data : []);
      setCounts(Array.isArray(countsRes.data) ? countsRes.data : []);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const countFor = (key: string) => counts.find((c) => c.category === key)?.count ?? 0;

  const handleDownload = (file: FileData) => {
    window.open(`/api/v1/files/${file.id}/download`, '_blank');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadProgress(0);
    try {
      await uploadFile(file, uploadCategory, (pct) => setUploadProgress(pct));
      setShowUpload(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchFiles();
    } catch {
      setUploadProgress(null);
    }
  };

  const handleDelete = async (fileId: string) => {
    setDeleting(fileId);
    try {
      await deleteFile(fileId);
      fetchFiles();
    } catch { /* ignore */ }
    setDeleting(null);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('documents', 'Documents')}</h1>
        {isAdmin && (
          <Button variant="primary" onClick={() => setShowUpload(true)}>
            + {t('upload', 'Upload')}
          </Button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 border-b mb-6 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === cat.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat.label}
            {cat.key && countFor(cat.key) > 0 && (
              <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">
                {countFor(cat.key)}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : files.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          {t('noDocuments', 'No documents in this category.')}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-4 p-3 border rounded-md bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                {file.mime_type.includes('pdf') ? 'PDF' : file.name.split('.').pop()?.toUpperCase() || 'FILE'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size ?? 0)} · {new Date(file.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => handleDownload(file)}
                  className="text-xs text-primary hover:underline"
                >
                  {t('download', 'Download')}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(file.id)}
                    disabled={deleting === file.id}
                    className="text-xs text-red-500 hover:underline disabled:opacity-50"
                  >
                    {deleting === file.id ? '…' : t('delete', 'Delete')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      <Modal open={showUpload} title={t('upload', 'Upload Document')} onClose={() => setShowUpload(false)}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">{t('category', 'Category')}</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
            >
              {CATEGORIES.filter((c) => c.key).map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">{t('file', 'File')}</label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleUpload}
              disabled={uploadProgress !== null}
              className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary file:text-white hover:file:opacity-90"
            />
          </div>
          {uploadProgress !== null && (
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
