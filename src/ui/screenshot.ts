const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;
const EXPORT_SCALE = 4;
const EXPORT_WIDTH = VIEW_WIDTH * EXPORT_SCALE;
const EXPORT_HEIGHT = VIEW_HEIGHT * EXPORT_SCALE;
const JPEG_QUALITY = 0.92;

type SaveFilePickerOptions = {
  suggestedName?: string;
  id?: string;
  startIn?: "desktop" | "documents" | "downloads" | "pictures";
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
};

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

declare global {
  interface Window {
    showSaveFilePicker?: (
      options?: SaveFilePickerOptions,
    ) => Promise<FileSystemFileHandle>;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function collectStylesheetCss(): string {
  const chunks: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        chunks.push(rule.cssText);
      }
    } catch {
      // Cross-origin sheets cannot be read.
    }
  }
  return chunks.join("\n");
}

function copyCssVariables(from: Element, to: SVGSVGElement): void {
  const computed = getComputedStyle(from);
  for (const name of Array.from(computed)) {
    if (name.startsWith("--")) {
      to.style.setProperty(name, computed.getPropertyValue(name));
    }
  }
}

function cloneDiagramSvg(source: SVGSVGElement): SVGSVGElement {
  const clone = source.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(EXPORT_WIDTH));
  clone.setAttribute("height", String(EXPORT_HEIGHT));
  clone.removeAttribute("style");
  clone.classList.remove("is-highlighted");

  copyCssVariables(document.documentElement, clone);
  copyCssVariables(source, clone);
  clone.style.setProperty("font-family", getComputedStyle(source).fontFamily);
  clone.style.setProperty("background", getComputedStyle(source).backgroundColor);

  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `${collectStylesheetCss()}
svg.diagram-scene {
  width: ${EXPORT_WIDTH}px;
  height: ${EXPORT_HEIGHT}px;
  border: none;
}`;
  clone.insertBefore(style, clone.firstChild);
  return clone;
}

function serializeSvg(svg: SVGSVGElement): string {
  return `<?xml version="1.0" encoding="UTF-8"?>${new XMLSerializer().serializeToString(svg)}`;
}

function loadSvgImage(svgXml: string): Promise<HTMLImageElement> {
  const blob = new Blob([svgXml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not rasterize the diagram."));
    };
    image.src = url;
  });
}

function rasterizeToJpeg(image: HTMLImageElement, background: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    return Promise.reject(new Error("Could not create a drawing surface."));
  }

  context.fillStyle = background;
  context.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  context.drawImage(image, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Could not encode the JPEG."));
        }
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

async function saveJpegBlob(blob: Blob, filename: string): Promise<void> {
  if (typeof window.showSaveFilePicker === "function") {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      id: "heat-pump-diagram-screenshot",
      startIn: "downloads",
      types: [
        {
          description: "JPEG image",
          accept: { "image/jpeg": [".jpg", ".jpeg"] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function defaultFilename(svg: SVGSVGElement): string {
  const mode = svg.dataset.mode === "cooling" ? "cooling" : "heating";
  return `heat-pump-${mode}.jpg`;
}

export async function saveDiagramScreenshot(): Promise<void> {
  const svg = document.querySelector<SVGSVGElement>("svg.diagram-scene");
  if (!svg) {
    throw new Error("Diagram is not available.");
  }

  const background = getComputedStyle(svg).backgroundColor || "#ffffff";
  const clone = cloneDiagramSvg(svg);
  const image = await loadSvgImage(serializeSvg(clone));
  const blob = await rasterizeToJpeg(image, background);

  try {
    await saveJpegBlob(blob, defaultFilename(svg));
  } catch (error) {
    if (isAbortError(error)) {
      return;
    }
    throw error;
  }
}
