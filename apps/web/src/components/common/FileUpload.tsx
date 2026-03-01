import { useState, useRef, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
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
      const { data } = await uploadFile(file, setProgress);
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
    <div className="file-upload">
      {uploaded ? (
        <div className="file-upload-result">
          <FilePreview file={uploaded} />
          <Button variant="ghost" size="sm" onClick={handleRemove}>{t('remove', 'Remove')}</Button>
        </div>
      ) : (
        <div
          className={`file-upload-zone ${dragOver ? 'file-upload-zone--active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={onBrowse}
        >
          <input ref={inputRef} type="file" hidden accept={accept} onChange={handleChange} />
          {uploading ? (
            <div className="file-upload-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-muted">{progress}%</span>
            </div>
          ) : (
            <>
              <span className="file-upload-icon">&#x1F4C1;</span>
              <span>{t('dragDrop', 'Drag & drop a file here, or click to browse')}</span>
              <span className="text-muted">{t('maxFileSize', `Max ${maxSize}MB`)}</span>
            </>
          )}
        </div>
      )}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
