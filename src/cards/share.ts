import { toPng } from "html-to-image";

/**
 * Captures a card DOM node to a PNG and shares it.
 *
 * Order of attempts:
 *   1. **Web Share API with files** — iOS Safari + Android Chrome support
 *      `navigator.share({ files: [...] })`. This pops up the native share
 *      sheet so the user can post directly to Instagram, save to photos,
 *      AirDrop, etc. The best path on mobile.
 *   2. **Download fallback** — desktop browsers don't support sharing
 *      files via Web Share API. We synthesize a download link instead.
 *
 * The capture uses `pixelRatio: 2` so the PNG is sharp on retina displays
 * and `cacheBust: true` so re-shares always regenerate fresh (otherwise
 * the lib may return a stale data URL on rapid second clicks).
 *
 * Errors are caught and surfaced via the optional `onError` callback so the
 * caller can show feedback to the user. The function never throws.
 */
export async function shareCard(
  node: HTMLElement,
  fileName: string,
  options: { onError?: (err: unknown) => void } = {},
): Promise<void> {
  try {
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#000000",
    });

    // Try the Web Share API first (best on mobile).
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        const blob = await dataUrlToBlob(dataUrl);
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "My Instagram Wrapped",
            text: "Check out my Instagram Wrapped!",
          });
          return;
        }
      } catch (err) {
        // Fall through to download. Common cases: user dismissed the share
        // sheet (AbortError), or the browser claims canShare but rejects.
        if (isAbortError(err)) return; // user-initiated cancel — silent
        // Other share errors fall through to the download fallback.
      }
    }

    // Download fallback for desktop browsers.
    triggerDownload(dataUrl, fileName);
  } catch (err) {
    options.onError?.(err);
  }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

function triggerDownload(dataUrl: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name: unknown }).name === "AbortError"
  );
}
