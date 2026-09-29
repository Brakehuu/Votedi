export type PreparedImage = {
  blob: Blob;
  contentType: string;
  transparent: boolean;
  extension: "webp";
};

const MAX_EDGE = 1600;
const MAX_BYTES = 10 * 1024 * 1024;

function assertImage(file: File) {
  const ok =
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    file.type === "image/webp" ||
    /\.(png|jpe?g|webp)$/i.test(file.name);
  if (!ok) throw new Error("BAD_TYPE");
  if (file.size > MAX_BYTES) throw new Error("TOO_LARGE");
}

async function decode(file: Blob) {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("BAD_IMAGE"));
        img.src = url;
      });
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function sizeOf(source: CanvasImageSource & { width: number; height: number }) {
  return { width: source.width, height: source.height };
}

async function drawFitted(source: CanvasImageSource & { width: number; height: number }) {
  const { width, height } = sizeOf(source);
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("BAD_IMAGE");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

function blobFromCanvas(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("BAD_IMAGE"))),
      type,
      quality,
    );
  });
}

/** Sample alpha channel; step keeps this fast on large images. */
function hasTransparency(data: Uint8ClampedArray) {
  for (let i = 3; i < data.length; i += 16) {
    if (data[i]! < 250) return true;
  }
  return false;
}

export async function prepareItemImage(
  file: File,
  onProgress?: (message: string) => void,
): Promise<PreparedImage> {
  assertImage(file);
  onProgress?.("Đang nén ảnh...");
  const decoded = await decode(file);
  try {
    const { canvas, ctx } = await drawFitted(decoded);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const transparent = hasTransparency(pixels.data);
    const blob = await blobFromCanvas(canvas, "image/webp", 0.84);
    return { blob, contentType: "image/webp", transparent, extension: "webp" };
  } finally {
    if ("close" in decoded && typeof decoded.close === "function") decoded.close();
  }
}

export async function compressAvatar(file: File) {
  assertImage(file);
  const decoded = await decode(file);
  try {
    const edge = 512;
    const { width, height } = sizeOf(decoded);
    const scale = Math.min(1, edge / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("BAD_IMAGE");
    ctx.drawImage(decoded, 0, 0, canvas.width, canvas.height);
    return blobFromCanvas(canvas, "image/webp", 0.84);
  } finally {
    if ("close" in decoded && typeof decoded.close === "function") decoded.close();
  }
}

export const MAX_ITEM_BYTES = MAX_BYTES;
export const MAX_ITEMS_PER_ROOM = 32;
