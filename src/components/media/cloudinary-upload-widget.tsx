"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "@/lib/client-toast";
import { Check, ImagePlus, Link2, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  uploadImageToCloudinary,
  uploadRemoteImageToCloudinary,
  type CloudinaryUploadFolder,
  type CloudinaryUploadResult,
} from "@/services/cloudinary-upload-service";
import { cn } from "@/lib/utils";

type CloudinaryWidgetInfo = {
  secure_url?: string;
  public_id?: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
};

type UploadMode = "file" | "url";

export function CloudinaryUploadWidget({
  folder,
  restaurantId,
  tags,
  aspectRatio,
  label = "Upload image",
  className,
  onUpload,
}: {
  folder: CloudinaryUploadFolder | string;
  restaurantId?: string;
  tags?: string[];
  aspectRatio?: number;
  label?: string;
  className?: string;
  onUpload: (url: string, info: CloudinaryWidgetInfo) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string>("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<UploadMode>("file");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [remoteUrl, setRemoteUrl] = useState("");

  function openUploader() {
    setOpen(true);
  }

  function closeUploader() {
    if (uploading) return;
    clearSelectedFile();
    setRemoteUrl("");
    setDragActive(false);
    setOpen(false);
  }

  function clearSelectedFile() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = "";
    setPreviewUrl("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function chooseFile(nextFile?: File | null) {
    if (!nextFile) return;
    if (!nextFile.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (nextFile.size > 8_000_000) {
      toast.error("Image must be smaller than 8 MB.");
      return;
    }
    clearSelectedFile();
    const url = URL.createObjectURL(nextFile);
    previewUrlRef.current = url;
    setFile(nextFile);
    setPreviewUrl(url);
    setMode("file");
  }

  async function uploadLocalFile() {
    if (!file) {
      toast.error("Choose an image first.");
      return;
    }
    await performUpload(() =>
      uploadImageToCloudinary(file, {
        folder,
        restaurantId,
        aspectRatio,
        tags,
      }),
    );
  }

  async function uploadWebAddress() {
    await performUpload(() =>
      uploadRemoteImageToCloudinary(remoteUrl, {
        folder,
        restaurantId,
        aspectRatio,
        tags,
      }),
    );
  }

  async function performUpload(upload: () => Promise<CloudinaryUploadResult>) {
    setUploading(true);
    try {
      const result = await upload();
      onUpload(result.secureUrl, toWidgetInfo(result));
      toast.success("Image saved to Cloudinary.");
      closeUploader();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" className={className} onClick={openUploader}>
        <ImagePlus className="size-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? openUploader() : closeUploader())}>
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-5xl gap-0 overflow-hidden rounded-2xl border bg-card p-0 text-card-foreground shadow-2xl sm:w-[calc(100vw-2rem)]">
          <DialogHeader className="border-b px-4 py-3 pr-12 sm:px-5">
            <DialogTitle className="text-lg font-black">Upload image</DialogTitle>
            <DialogDescription>
              Images are saved to Cloudinary. Camera capture is disabled.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="customer-scroll flex gap-2 overflow-x-auto border-b px-4 py-3 sm:px-5">
              <TabButton active={mode === "file"} onClick={() => setMode("file")} icon={UploadCloud} label="My files" />
              <TabButton active={mode === "url"} onClick={() => setMode("url")} icon={Link2} label="Web address" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-5">
              {mode === "file" ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setDragActive(true);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setDragActive(false);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragActive(false);
                      chooseFile(event.dataTransfer.files[0]);
                    }}
                    className={cn(
                      "flex min-h-[18rem] flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-background p-6 text-center transition md:min-h-[24rem]",
                      dragActive ? "border-orange-500 bg-orange-50 text-orange-950" : "border-border hover:border-orange-300",
                    )}
                  >
                    <UploadCloud className="size-12 text-orange-500" />
                    <p className="mt-4 text-lg font-black">Drag and drop an image here</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">or browse from your computer</p>
                    <span className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-black text-white">Browse</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif"
                      className="sr-only"
                      onChange={(event) => chooseFile(event.target.files?.[0])}
                    />
                  </button>

                  <PreviewPanel file={file} previewUrl={previewUrl} aspectRatio={aspectRatio} />
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="rounded-2xl border bg-background p-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-black">Image web address</span>
                      <input
                        value={remoteUrl}
                        onChange={(event) => setRemoteUrl(event.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="h-12 rounded-xl border bg-card px-4 text-sm font-semibold text-foreground outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                      />
                    </label>
                    <p className="mt-3 text-sm font-semibold text-muted-foreground">
                      Paste any public image URL. The app will copy it into your Cloudinary library.
                    </p>
                    {remoteUrl ? (
                      <div className="relative mt-4 overflow-hidden rounded-2xl border bg-slate-100" style={{ aspectRatio: aspectRatio ? `${aspectRatio} / 1` : "16 / 9" }}>
                        <Image src={remoteUrl} alt="Web address preview" fill sizes="280px" className="object-cover" unoptimized />
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border bg-background p-4">
                    <h3 className="font-black">Web upload</h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
                      Remote images are uploaded directly to Cloudinary and then stored as Cloudinary URLs in the form.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-card p-4 shadow-[0_-12px_30px_rgba(0,0,0,0.12)] sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-muted-foreground">
                {aspectRatio ? `Crop ratio: ${formatRatio(aspectRatio)}. The image is center-cropped before upload.` : "No fixed crop ratio for this image."}
              </p>
              <div className="flex gap-2 sm:justify-end">
                <Button type="button" variant="outline" onClick={closeUploader} disabled={uploading}>
                  Cancel
                </Button>
                {mode === "file" ? (
                  <Button type="button" onClick={() => void uploadLocalFile()} disabled={!file || uploading} className="bg-orange-600 hover:bg-orange-700">
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Crop & upload
                  </Button>
                ) : (
                  <Button type="button" onClick={() => void uploadWebAddress()} disabled={!remoteUrl.trim() || uploading} className="bg-orange-600 hover:bg-orange-700">
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Upload web image
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof UploadCloud; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-black transition",
        active ? "border-orange-600 bg-orange-50 text-orange-700" : "border-border bg-background text-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function PreviewPanel({ file, previewUrl, aspectRatio }: { file: File | null; previewUrl: string; aspectRatio?: number }) {
  return (
    <aside className="rounded-2xl border bg-background p-4">
      <h3 className="font-black">Preview</h3>
      <div className="relative mt-3 overflow-hidden rounded-2xl border bg-slate-100" style={{ aspectRatio: aspectRatio ? `${aspectRatio} / 1` : "16 / 9" }}>
        {previewUrl ? (
          <Image src={previewUrl} alt="Selected image preview" fill sizes="280px" className="object-cover" unoptimized />
        ) : (
          <div className="grid h-full place-items-center p-6 text-center text-sm font-semibold text-slate-500">
            Select an image to preview the crop.
          </div>
        )}
      </div>
      {file ? (
        <div className="mt-3 rounded-2xl bg-muted p-3 text-sm">
          <p className="truncate font-black">{file.name}</p>
          <p className="font-semibold text-muted-foreground">{formatBytes(file.size)}</p>
        </div>
      ) : null}
      <p className="mt-3 text-xs font-semibold leading-5 text-muted-foreground">
        The preview shows the final crop area. Click Crop & upload once; it will not return to browse unless upload fails.
      </p>
    </aside>
  );
}

function toWidgetInfo(result: CloudinaryUploadResult): CloudinaryWidgetInfo {
  return {
    secure_url: result.secureUrl,
    public_id: result.publicId,
    thumbnail_url: result.thumbnailUrl,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRatio(value: number) {
  if (Math.abs(value - 1) < 0.01) return "1:1";
  if (Math.abs(value - 16 / 9) < 0.01) return "16:9";
  if (Math.abs(value - 4 / 3) < 0.01) return "4:3";
  if (Math.abs(value - 4 / 5) < 0.01) return "4:5";
  return `${value.toFixed(2)}:1`;
}
