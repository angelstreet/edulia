import { useState, useRef, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/Button';
import { uploadFile, type FileData } from '../../api/files';
import { FilePreview } from './FilePreview';

interface FileUploadProps {
  onUpload?: (file: FileData) => void;
  accept?: string;
  maxSize?: number; // MB
}

export function FileUpload({ onUpload, accept, maxSize = 50 }: FileUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState<FileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      setError(t('fileTooLarge', `File exceeds ${maxSize}MB limit.`));
      return;
    }
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const { data } = await uploadFile(file, 'general', setProgress);
      setUploaded(data);
      onUpload?.(data);
    } catch {
      setError(t('uploadError', 'Upload failed. Please try again.'));
    }
    setUploading(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onBrowse = () => inputRef.current?.click();

  const handleChange = () => {
    const file = inputRef.current?.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    setUploaded(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="w-full">
      {uploaded ? (
        <div className="flex items-center gap-3">
          <FilePreview file={uploaded} />
          <Button variant="ghost" size="sm" onClick={handleRemove}>{t('remove', 'Remove')}</Button>
        </div>
      ) : (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors flex flex-col items-center gap-2 text-sm text-muted-foreground',
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary hover:bg-primary/5'
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={onBrowse}
        >
          <input ref={inputRef} type="file" hidden accept={accept} onChange={handleChange} />
          {uploading ? (
            <div className="w-full flex flex-col items-center gap-2">
              <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-[width] duration-300" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span>{t('dragDrop', 'Drag & drop a file here, or click to browse')}</span>
              <span className="text-xs text-muted-foreground">{t('maxFileSize', `Max ${maxSize}MB`)}</span>
            </>
          )}
        </div>
      )}
      {error && <div className="text-xs text-destructive mt-1">{error}</div>}
    </div>
  );
}
