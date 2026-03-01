import type { FileData } from '../../api/files';

interface FilePreviewProps {
  file: FileData;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '\u{1F5BC}';
  if (mimeType === 'application/pdf') return '\u{1F4C4}';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '\u{1F4CA}';
  if (mimeType.includes('document') || mimeType.includes('word')) return '\u{1F4DD}';
  return '\u{1F4CE}';
}

export function FilePreview({ file }: FilePreviewProps) {
  const isImage = file.mime_type.startsWith('image/');

  return (
    <div className="file-preview">
      {isImage ? (
        <img src={file.url} alt={file.name} className="file-preview-thumb" />
      ) : (
        <span className="file-preview-icon">{getIcon(file.mime_type)}</span>
      )}
      <div className="file-preview-info">
        <span className="file-preview-name">{file.name}</span>
        <span className="text-muted">{formatSize(file.size)}</span>
      </div>
    </div>
  );
}
