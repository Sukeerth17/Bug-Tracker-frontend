import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, UploadCloud, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mediaApi, MediaUploadResult } from '@/services/mediaApi';
import { toast } from '@/components/ui/sonner';

interface AttachmentUploaderProps {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  allowRemove?: boolean;
  className?: string;
}

type UploadState = {
  tempId: string;
  file: File;
  progress: number;
  status: 'uploading' | 'done';
  result?: MediaUploadResult;
  previewUrl?: string;
};

type AttachmentMeta = {
  id: string;
  filename: string;
  sizeBytes: number;
  contentType: string;
  url?: string;
};

const isImageType = (contentType: string) => contentType.startsWith('image/');

const formatBytes = (bytes: number) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const AttachmentUploader = ({
  value,
  onChange,
  disabled = false,
  label = 'Attachments',
  description = 'Drag files here or click to browse',
  allowRemove = true,
  className,
}: AttachmentUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [metaMap, setMetaMap] = useState<Record<string, AttachmentMeta>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const valueRef = useRef<string[]>(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const attachments = useMemo(() => value.map((id) => metaMap[id]).filter(Boolean) as AttachmentMeta[], [value, metaMap]);
  const imageAttachments = useMemo(() => attachments.filter((a) => a.url && isImageType(a.contentType)), [attachments]);

  useEffect(() => {
    let mounted = true;
    const fetchUrls = async () => {
      await Promise.all(value.map(async (id) => {
        if (metaMap[id]?.url) return;
        try {
          const { url, filename, contentType, sizeBytes } = await mediaApi.getUrl(id);
          if (!mounted) return;
          setMetaMap((prev) => ({
            ...prev,
            [id]: {
              id,
              filename: filename || prev[id]?.filename || `Attachment ${id}`,
              sizeBytes: sizeBytes ?? prev[id]?.sizeBytes ?? 0,
              contentType: contentType || prev[id]?.contentType || 'application/octet-stream',
              url,
            },
          }));
        } catch {
          // ignore
        }
      }));
    };
    if (value.length > 0) {
      void fetchUrls();
    }
    return () => { mounted = false; };
  }, [value]);

  const handleFiles = useCallback(async (files: File[]) => {
    if (disabled || files.length === 0) return;

    const rejectedNonImages = files.filter((file) => !file.type.startsWith('image/'));
    const oversizeImages = files.filter((file) => file.type.startsWith('image/') && file.size > 5 * 1024 * 1024);
    const acceptedFiles = files.filter((file) => file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024);
    if (rejectedNonImages.length > 0) {
      toast('Only images are allowed');
    }
    if (oversizeImages.length > 0) {
      toast('Max image size is 5MB');
    }
    if (acceptedFiles.length === 0) return;

    const newUploads = acceptedFiles.map((file) => ({
      tempId: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'uploading' as const,
      previewUrl: URL.createObjectURL(file),
    }));
    setUploads((prev) => [...newUploads, ...prev]);

    newUploads.forEach((upload) => {
      const interval = setInterval(() => {
        setUploads((prev) => prev.map((u) => {
          if (u.tempId !== upload.tempId || u.status !== 'uploading') return u;
          const next = Math.min(u.progress + Math.random() * 18 + 6, 92);
          return { ...u, progress: next };
        }));
      }, 250);

      mediaApi.upload(upload.file)
        .then((result) => {
          clearInterval(interval);
          setUploads((prev) => prev.filter((u) => u.tempId !== upload.tempId));
          setMetaMap((prev) => ({
            ...prev,
            [String(result.id)]: {
              id: String(result.id),
              filename: result.filename,
              sizeBytes: result.sizeBytes,
              contentType: result.contentType,
            },
          }));
          const nextIds = Array.from(new Set([...(valueRef.current || []), String(result.id)]));
          onChange(nextIds);
          void mediaApi.getUrl(String(result.id)).then(({ url }) => {
            setMetaMap((prev) => ({
              ...prev,
              [String(result.id)]: {
                ...(prev[String(result.id)] || {
                  id: String(result.id),
                  filename: result.filename,
                  sizeBytes: result.sizeBytes,
                  contentType: result.contentType,
                }),
                url,
              },
            }));
          }).catch(() => undefined);
        })
        .catch(() => {
          clearInterval(interval);
          setUploads((prev) => prev.filter((u) => u.tempId !== upload.tempId));
        });
    });
  }, [disabled, onChange]);

  useEffect(() => {
    return () => {
      uploads.forEach((upload) => {
        if (upload.previewUrl) URL.revokeObjectURL(upload.previewUrl);
      });
    };
  }, [uploads]);

  const openFileDialog = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleRemove = async (id: string) => {
    if (!allowRemove) return;
    await mediaApi.delete(id);
    onChange(value.filter((item) => item !== id));
    setMetaMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleLightboxOpen = (id: string) => {
    const idx = imageAttachments.findIndex((item) => item.id === id);
    if (idx === -1) return;
    setLightboxIndex(idx);
    setZoom(1);
    setLightboxOpen(true);
  };

  const currentImage = imageAttachments[lightboxIndex];

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      </div>
      <div
        className={cn(
          'upload-zone group flex flex-col items-center justify-center gap-2 px-6 py-6 text-center rounded-xl',
          dragActive && 'upload-zone-active',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
        onDragOver={(e) => {
          e.preventDefault();
          if (disabled) return;
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          if (disabled) return;
          setDragActive(false);
          void handleFiles(Array.from(e.dataTransfer.files || []));
        }}
        onClick={openFileDialog}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFileDialog();
          }
        }}
        aria-label="Upload attachments"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
          <UploadCloud className="h-5 w-5" />
        </div>
        <div className="text-sm font-medium">Drag files here or click to browse</div>
        <div className="text-xs text-muted-foreground">{description}</div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            void handleFiles(files);
            e.currentTarget.value = '';
          }}
        />
      </div>

      {(uploads.length > 0 || value.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {uploads.map((upload) => (
            <div key={upload.tempId} className="rounded-xl border bg-card p-3 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden flex items-center justify-center text-muted-foreground">
                  {upload.previewUrl ? (
                    <img src={upload.previewUrl} alt={upload.file.name} className="h-full w-full object-cover" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{upload.file.name}</p>
                  <p className="text-[11px] text-muted-foreground">{formatBytes(upload.file.size)}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full transition-all bg-primary"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}

          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="group relative rounded-xl border bg-card p-2 shadow-sm transition-all duration-200 hover:shadow-md animate-fade-in"
            >
              <button
                type="button"
                onClick={() => handleRemove(attachment.id)}
                className={cn(
                  'absolute right-2 top-2 z-10 rounded-full bg-background/80 p-1 text-muted-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100',
                  !allowRemove && 'hidden'
                )}
                aria-label="Remove attachment"
              >
                <X className="h-3 w-3" />
              </button>
              {attachment.url && isImageType(attachment.contentType) ? (
                <button type="button" className="w-full" onClick={() => handleLightboxOpen(attachment.id)}>
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
                    <img src={attachment.url} alt={attachment.filename} className="h-full w-full object-cover" />
                  </div>
                </button>
              ) : (
                <div className="aspect-[4/3] w-full rounded-lg bg-muted flex items-center justify-center">
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <FileText className="h-5 w-5" />
                    <span className="text-[10px] uppercase">{attachment.filename.split('.').pop() || 'FILE'}</span>
                  </div>
                </div>
              )}
              <div className="mt-2">
                <p className="text-xs font-medium truncate">{attachment.filename}</p>
                <p className="text-[11px] text-muted-foreground">{formatBytes(attachment.sizeBytes)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightboxOpen && currentImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close lightbox"
            onClick={() => setLightboxOpen(false)}
          />
          <div className="relative z-10 max-w-4xl w-[90vw]">
            <div className="flex items-center justify-between mb-3 text-white">
              <div>
                <p className="text-sm font-semibold">{currentImage.filename}</p>
                <p className="text-xs text-white/70">{formatBytes(currentImage.sizeBytes)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                  className="rounded-full bg-white/10 p-2 hover:bg-white/20"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
                  className="rounded-full bg-white/10 p-2 hover:bg-white/20"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="rounded-full bg-white/10 p-2 hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-black">
              <img
                src={currentImage.url}
                alt={currentImage.filename}
                style={{ transform: `scale(${zoom})` }}
                className="w-full h-[70vh] object-contain transition-transform duration-200"
              />
              {imageAttachments.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex((prev) => (prev - 1 + imageAttachments.length) % imageAttachments.length);
                      setZoom(1);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex((prev) => (prev + 1) % imageAttachments.length);
                      setZoom(1);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentUploader;
