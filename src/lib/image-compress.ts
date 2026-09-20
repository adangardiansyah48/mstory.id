export type CompressOpts = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxBytes?: number;
};

const DEFAULTS: Required<CompressOpts> = {
  maxWidth: 1600,
  maxHeight: 1200,
  quality: 0.72,
  maxBytes: 240 * 1024,
};

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Gagal baca file"));
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal decode gambar"));
    img.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Gagal kompres canvas"));
      else resolve(blob);
    }, type, quality);
  });
}

export async function compressImage(
  file: File,
  opts: CompressOpts = {},
): Promise<File> {
  if (file.type === "image/svg+xml") return file;
  const cfg = { ...DEFAULTS, ...opts };
  let src: string;
  try {
    src = await readAsDataUrl(file);
  } catch {
    return file;
  }
  let img: HTMLImageElement;
  try {
    img = await loadImage(src);
  } catch {
    return file;
  }
  let w = img.width;
  let h = img.height;
  const scale = Math.min(cfg.maxWidth / w, cfg.maxHeight / h, 1);
  if (scale < 1) {
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);

  let quality = cfg.quality;
  let blob = await toBlob(canvas, "image/webp", quality);
  while (blob.size > cfg.maxBytes && quality > 0.32) {
    quality = Math.max(0.32, quality - 0.1);
    blob = await toBlob(canvas, "image/webp", quality);
  }
  if (blob.size > cfg.maxBytes) {
    const smaller = document.createElement("canvas");
    const down = 0.82;
    smaller.width = Math.round(w * down);
    smaller.height = Math.round(h * down);
    const sCtx = smaller.getContext("2d");
    if (sCtx) {
      sCtx.drawImage(canvas, 0, 0, smaller.width, smaller.height);
      const smallBlob = await toBlob(smaller, "image/webp", 0.45);
      if (smallBlob.size < blob.size) blob = smallBlob;
    }
  }
  const base = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${base}.webp`, { type: "image/webp" });
}

export function compressedBannerPath(slot: number): string {
  return `banners/${slot}.webp`;
}

export function compressedLogoPath(): string {
  return `logos/logo.webp`;
}
