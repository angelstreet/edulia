import { Image, FileText, Sheet, FileEdit, Paperclip, type LucideIcon } from 'lucide-react';
import type { FileData } from '../../api/files';

interface FilePreviewProps {
  file: FileData;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getIcon(mimeType: string): LucideIcon {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return Sheet;
  if (mimeType.includes('document') || mimeType.includes('word')) return FileEdit;
  return Paperclip;
}

export function FilePreview({ file }: FilePreviewProps) {
  const isImage = file.mime_type.startsWith('image/');
  const Icon = getIcon(file.mime_type);

  return (
    <div className="flex items-center gap-3">
      {isImage ? (
        <img src={file.url} alt={file.name} className="w-12 h-12 object-cover rounded-md border border-border" />
      ) : (
        <Icon className="h-8 w-8 text-muted-foreground" />
      )}
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{file.name}</span>
        <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
      </div>
    </div>
  );
}
