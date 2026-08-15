export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ACCEPTED_AUDIO_EXTENSIONS = [
  "mp3",
  "wav",
  "m4a",
  "aac",
  "flac",
  "ogg",
] as const;

export const ACCEPTED_AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/flac",
  "audio/ogg",
  "audio/vorbis",
] as const;

export const ACCEPTED_FORMATS_LABEL = ACCEPTED_AUDIO_EXTENSIONS.map((ext) =>
  ext.toUpperCase(),
).join(", ");

export type UploadStep = 1 | 2 | 3 | 4;

export type UploadOutcome = "idle" | "success" | "error";

export function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined || Number.isNaN(bytes)) {
    return "Unknown size";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length < 2) {
    return "";
  }
  return parts[parts.length - 1]?.toLowerCase() ?? "";
}

export function isAcceptedAudioFile(params: {
  filename: string;
  mimeType?: string | null;
}): boolean {
  const extension = getFileExtension(params.filename);
  if (
    ACCEPTED_AUDIO_EXTENSIONS.includes(
      extension as (typeof ACCEPTED_AUDIO_EXTENSIONS)[number],
    )
  ) {
    return true;
  }
  if (!params.mimeType) {
    return false;
  }
  return ACCEPTED_AUDIO_MIME_TYPES.includes(
    params.mimeType as (typeof ACCEPTED_AUDIO_MIME_TYPES)[number],
  );
}

export class MaxFileSizeError extends Error {
  constructor() {
    super(`Max file size is ${MAX_FILE_SIZE_MB} Mb`);
    this.name = "MaxFileSizeError";
  }
}

export class UnsupportedAudioFormatError extends Error {
  constructor() {
    super(`Unsupported format. Please use: ${ACCEPTED_FORMATS_LABEL}`);
    this.name = "UnsupportedAudioFormatError";
  }
}
