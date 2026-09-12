/**
 * String sanitization helpers. Pure functions, side-effect free.
 *
 * Used to convert arbitrary yt-dlp titles into filesystem-safe slugs.
 */

export const sanitizeTitle = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

/** Escape forward slashes inside a format selector so they can be used in filenames. */
export const escapeFormatForFilename = (format: string): string => format.replace(/\//g, "_");
