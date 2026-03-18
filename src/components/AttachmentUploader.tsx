import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileVideo,
  Play,
  RefreshCcw,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mediaApi, MediaUploadResult } from '@/services/mediaApi';

interface AttachmentUploaderProps {
  value: string[];
  onChange: (next: string[]) => void;
  projectId?: string;
  featureName?: string | null;
  disabled?: boolean;
  label?: string;
  description?: string;
  allowRemove?: boolean;
  className?: string;
}

type UploadStatus = 'uploading' | 'error';

type UploadCard = {
  tempId: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
  canRetry: boolean;
  previewUrl?: string;
};

type AttachmentMeta = {
  id: string;
  filename: string;
  sizeBytes: number;
  contentType: string;
  url?: string;
};

type ViewerState =
  | { type: 'image'; index: number }
  | { type: 'video'; attachmentId: string }
  | null;

const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
] as const;

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
]);

const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const VIDEO_MAX_SIZE_BYTES = 50 * 1024 * 1024;

const isImageType = (contentType: string) => IMAGE_MIME_TYPES.has(contentType.toLowerCase() as (typeof ACCEPTED_MIME_TYPES)[number]);
const isVideoType = (contentType: string) => VIDEO_MIME_TYPES.has(contentType.toLowerCase() as (typeof ACCEPTED_MIME_TYPES)[number]);

const formatBytes = (bytes: number) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const getValidationError = (file: File) => {
  const mimeType = file.type.toLowerCase();
  const isImage = IMAGE_MIME_TYPES.has(mimeType as (typeof ACCEPTED_MIME_TYPES)[number]);
  const isVideo = VIDEO_MIME_TYPES.has(mimeType as (typeof ACCEPTED_MIME_TYPES)[number]);

  if (!isImage && !isVideo) {
    return 'Only image and video files are accepted';
  }
  if (isImage && file.size > IMAGE_MAX_SIZE_BYTES) {
    return 'Images must be under 5MB';
  }
  if (isVideo && file.size > VIDEO_MAX_SIZE_BYTES) {
    return 'Videos must be under 50MB';
  }
  return null;
};

const AttachmentUploader = ({
  value,
  onChange,
  projectId,
  featureName,
  disabled = false,
  label = 'Attachments',
  description = 'Drag images or videos here, or click to browse',
  allowRemove = true,
  className,
}: AttachmentUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<string[]>(value);
  const uploadIntervalsRef = useRef<Record<string, number>>({});
  const uploadsRef = useRef<UploadCard[]>([]);

  const [dragActive, setDragActive] = useState(false);
  const [uploads, setUploads] = useState<UploadCard[]>([]);
  const [metaMap, setMetaMap] = useState<Record<string, AttachmentMeta>>({});
  const [viewer, setViewer] = useState<ViewerState>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    uploadsRef.current = uploads;
  }, [uploads]);

  const attachments = useMemo(
    () => value.map((id) => metaMap[id]).filter(Boolean) as AttachmentMeta[],
    [value, metaMap]
  );

  const imageAttachments = useMemo(
    () => attachments.filter((attachment) => attachment.url && isImageType(attachment.contentType)),
    [attachments]
  );

  const uploadingCount = uploads.filter((upload) => upload.status === 'uploading').length;

  useEffect(() => {
    let mounted = true;

    const fetchUrls = async () => {
      await Promise.all(
        value.map(async (id) => {
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
            // Keep the existing metadata if the URL fetch fails.
          }
        })
      );
    };

    if (value.length > 0) {
      void fetchUrls();
    }

    return () => {
      mounted = false;
    };
  }, [value, metaMap]);

  useEffect(() => {
    if (!viewer) {
      setZoom(1);
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setViewer(null);
        return;
      }
      if (viewer.type === 'image' && imageAttachments.length > 1) {
        if (event.key === 'ArrowRight') {
          setViewer((prev) => prev && prev.type === 'image'
            ? { type: 'image', index: (prev.index + 1) % imageAttachments.length }
            : prev);
        }
        if (event.key === 'ArrowLeft') {
          setViewer((prev) => prev && prev.type === 'image'
            ? { type: 'image', index: (prev.index - 1 + imageAttachments.length) % imageAttachments.length }
            : prev);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewer, imageAttachments.length]);

  useEffect(() => {
    return () => {
      Object.values(uploadIntervalsRef.current).forEach((id) => window.clearInterval(id));
      uploadsRef.current.forEach((upload) => {
        if (upload.previewUrl) {
          URL.revokeObjectURL(upload.previewUrl);
        }
      });
    };
  }, []);

  const removeUploadCard = useCallback((tempId: string, revokePreview = true) => {
    setUploads((prev) => {
      const upload = prev.find((item) => item.tempId === tempId);
      if (revokePreview && upload?.previewUrl) {
        URL.revokeObjectURL(upload.previewUrl);
      }
      return prev.filter((item) => item.tempId !== tempId);
    });
    if (uploadIntervalsRef.current[tempId]) {
      window.clearInterval(uploadIntervalsRef.current[tempId]);
      delete uploadIntervalsRef.current[tempId];
    }
  }, []);

  const startUpload = useCallback(async (upload: UploadCard) => {
    if (disabled || !projectId) {
      setUploads((prev) => prev.map((item) => item.tempId === upload.tempId
        ? { ...item, status: 'error', error: 'Select a project before uploading', progress: 0, canRetry: true }
        : item));
      return;
    }

    const interval = window.setInterval(() => {
      setUploads((prev) => prev.map((item) => {
        if (item.tempId !== upload.tempId || item.status !== 'uploading') return item;
        return {
          ...item,
          progress: Math.min(item.progress + Math.random() * 15 + 8, 92),
        };
      }));
    }, 180);
    uploadIntervalsRef.current[upload.tempId] = interval;

    try {
      const result: MediaUploadResult = await mediaApi.upload(upload.file, {
        projectId,
        featureName: featureName || undefined,
      });
      window.clearInterval(interval);
      delete uploadIntervalsRef.current[upload.tempId];

      setMetaMap((prev) => ({
        ...prev,
        [String(result.id)]: {
          id: String(result.id),
          filename: result.filename,
          sizeBytes: result.sizeBytes,
          contentType: result.contentType,
          url: upload.previewUrl,
        },
      }));

      const nextIds = Array.from(new Set([...(valueRef.current || []), String(result.id)]));
      onChange(nextIds);
      removeUploadCard(upload.tempId, false);

      void mediaApi.getUrl(String(result.id))
        .then(({ url }) => {
          setMetaMap((prev) => {
            const previousUrl = prev[String(result.id)]?.url;
            if (previousUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(previousUrl);
            }
            return {
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
            };
          });
        })
        .catch(() => undefined);
    } catch (error: any) {
      window.clearInterval(interval);
      delete uploadIntervalsRef.current[upload.tempId];
      const message = error?.response?.data?.message || 'Upload failed';
      setUploads((prev) => prev.map((item) => item.tempId === upload.tempId
        ? { ...item, status: 'error', error: message, progress: 0, canRetry: true }
        : item));
    }
  }, [disabled, featureName, onChange, projectId, removeUploadCard]);

  const queueFiles = useCallback((files: File[]) => {
    if (disabled || files.length === 0) return;

    const nextCards = files.map((file) => {
      const error = getValidationError(file);
      return {
        tempId: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: error ? 'error' : 'uploading',
        error: error || undefined,
        canRetry: !error,
        previewUrl: URL.createObjectURL(file),
      } satisfies UploadCard;
    });

    setUploads((prev) => [...nextCards, ...prev]);

    nextCards
      .filter((card) => card.status === 'uploading')
      .forEach((card) => {
        void startUpload(card);
      });
  }, [disabled, startUpload]);

  const openFileDialog = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleRemove = async (id: string) => {
    if (!allowRemove) return;
    await mediaApi.delete(id);
    onChange(value.filter((item) => item !== id));
    setMetaMap((prev) => {
      if (prev[id]?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(prev[id].url);
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const retryUpload = (tempId: string) => {
    setUploads((prev) => prev.map((item) => item.tempId === tempId
      ? { ...item, status: 'uploading', error: undefined, progress: 0 }
      : item));
    const upload = uploads.find((item) => item.tempId === tempId);
    if (upload) {
      void startUpload({ ...upload, status: 'uploading', error: undefined, progress: 0 });
    }
  };

  const currentImage = viewer?.type === 'image' ? imageAttachments[viewer.index] : null;
  const currentVideo = viewer?.type === 'video'
    ? attachments.find((attachment) => attachment.id === viewer.attachmentId)
    : null;

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      </div>

      <div
        className={cn(
          'upload-zone group flex flex-col items-center justify-center gap-2 rounded-xl px-6 py-6 text-center',
          dragActive && 'upload-zone-active',
          disabled && 'cursor-not-allowed opacity-60'
        )}
        onDragOver={(event) => {
          event.preventDefault();
          if (disabled) return;
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          if (disabled) return;
          setDragActive(false);
          queueFiles(Array.from(event.dataTransfer.files || []));
        }}
        onClick={openFileDialog}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openFileDialog();
          }
        }}
        aria-label="Upload attachments"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
          <UploadCloud className="h-5 w-5" />
        </div>
        <div className="text-sm font-medium">
          {uploadingCount > 0 ? 'Uploading… please wait' : 'Drag images or videos here, or click to browse'}
        </div>
        <div className="text-xs text-muted-foreground">{description}</div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_MIME_TYPES.join(',')}
          className="hidden"
          onChange={(event) => {
            queueFiles(Array.from(event.target.files || []));
            event.currentTarget.value = '';
          }}
        />
      </div>

      {(uploads.length > 0 || attachments.length > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {uploads.map((upload) => {
            const isImage = isImageType(upload.file.type);
            const isVideo = isVideoType(upload.file.type);

            return (
              <div
                key={upload.tempId}
                className={cn(
                  'animate-fade-in rounded-xl border bg-card p-3 shadow-sm transition-all duration-200',
                  upload.status === 'error' && 'border-red-400/60 bg-red-500/5'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-muted">
                    {upload.previewUrl && isImage && (
                      <img src={upload.previewUrl} alt={upload.file.name} className="h-full w-full object-cover" />
                    )}
                    {upload.previewUrl && isVideo && (
                      <div className="relative flex h-full w-full items-center justify-center bg-slate-950">
                        <video src={upload.previewUrl} className="h-full w-full object-cover opacity-70" muted />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="rounded-full bg-black/60 p-2 text-white">
                            <Play className="h-4 w-4 fill-current" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{upload.file.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {formatBytes(upload.file.size)}
                      </span>
                      {isVideo && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-2 py-0.5 text-[11px] text-white">
                          <FileVideo className="h-3 w-3" />
                          Video
                        </span>
                      )}
                    </div>
                    {upload.status === 'uploading' ? (
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Uploading</span>
                          <span>{Math.round(upload.progress)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary transition-all duration-200"
                            style={{ width: `${upload.progress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-red-600 dark:text-red-400">{upload.error}</p>
                        <div className="flex items-center gap-2">
                          {upload.canRetry && (
                            <button
                              type="button"
                              onClick={() => retryUpload(upload.tempId)}
                              className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium hover:bg-accent"
                            >
                              <RefreshCcw className="h-3 w-3" />
                              Retry
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeUploadCard(upload.tempId)}
                            className="inline-flex h-8 items-center rounded-md border px-2.5 text-xs font-medium hover:bg-accent"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {attachments.map((attachment) => {
            const image = attachment.url && isImageType(attachment.contentType);
            const video = attachment.url && isVideoType(attachment.contentType);

            return (
              <div
                key={attachment.id}
                className="group relative animate-fade-in rounded-xl border bg-card p-2 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                {allowRemove && (
                  <button
                    type="button"
                    onClick={() => handleRemove(attachment.id)}
                    className="absolute right-2 top-2 z-10 rounded-full bg-background/85 p-1 text-muted-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remove attachment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}

                {image ? (
                  <button type="button" className="w-full" onClick={() => {
                    const index = imageAttachments.findIndex((item) => item.id === attachment.id);
                    if (index !== -1) {
                      setViewer({ type: 'image', index });
                    }
                  }}>
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
                      <img src={attachment.url} alt={attachment.filename} className="h-full w-full object-cover" />
                    </div>
                  </button>
                ) : video ? (
                  <button type="button" className="w-full" onClick={() => setViewer({ type: 'video', attachmentId: attachment.id })}>
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-950">
                      <video src={attachment.url} className="h-full w-full object-cover opacity-70" muted />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full bg-black/60 p-3 text-white shadow-lg">
                          <Play className="h-5 w-5 fill-current" />
                        </div>
                      </div>
                    </div>
                  </button>
                ) : null}

                <div className="mt-2 space-y-1">
                  <p className="truncate text-xs font-medium">{attachment.filename}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {formatBytes(attachment.sizeBytes)}
                    </span>
                    {video && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-2 py-0.5 text-[11px] text-white">
                        <FileVideo className="h-3 w-3" />
                        Video
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewer?.type === 'image' && currentImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <button type="button" className="absolute inset-0" aria-label="Close preview" onClick={() => setViewer(null)} />
          <div className="relative z-10 w-[92vw] max-w-5xl">
            <div className="mb-3 flex items-center justify-between text-white">
              <div>
                <p className="text-sm font-semibold">{currentImage.filename}</p>
                <p className="text-xs text-white/70">{formatBytes(currentImage.sizeBytes)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setZoom((value) => Math.max(1, value - 0.5))} className="rounded-full bg-white/10 p-2 hover:bg-white/20">
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.5))} className="rounded-full bg-white/10 p-2 hover:bg-white/20">
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setViewer(null)} className="rounded-full bg-white/10 p-2 hover:bg-white/20">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-black">
              <img
                src={currentImage.url}
                alt={currentImage.filename}
                style={{ transform: `scale(${zoom})` }}
                className="h-[72vh] w-full object-contain transition-transform duration-200"
              />
              {imageAttachments.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setViewer((prev) => prev && prev.type === 'image'
                        ? { type: 'image', index: (prev.index - 1 + imageAttachments.length) % imageAttachments.length }
                        : prev);
                      setZoom(1);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewer((prev) => prev && prev.type === 'image'
                        ? { type: 'image', index: (prev.index + 1) % imageAttachments.length }
                        : prev);
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

      {viewer?.type === 'video' && currentVideo?.url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <button type="button" className="absolute inset-0" aria-label="Close preview" onClick={() => setViewer(null)} />
          <div className="relative z-10 w-[92vw] max-w-5xl rounded-2xl bg-card p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{currentVideo.filename}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(currentVideo.sizeBytes)}</p>
              </div>
              <button type="button" onClick={() => setViewer(null)} className="rounded-full bg-muted p-2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-hidden rounded-xl bg-black">
              <video src={currentVideo.url} controls className="h-[72vh] w-full bg-black object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentUploader;
