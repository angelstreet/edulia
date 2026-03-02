import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '../../../components/ui/Spinner';
import { getFiles, getCategories, type FileData, type CategoryCount } from '../../../api/files';

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
  const [files, setFiles] = useState<FileData[]>([]);
  const [counts, setCounts] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('documents', 'Documents')}</h1>
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
              <button
                onClick={() => handleDownload(file)}
                className="text-xs text-primary hover:underline shrink-0"
              >
                {t('download', 'Download')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
