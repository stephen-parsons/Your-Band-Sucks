const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._-\s]*$/;

export class UnsafeFilenameError extends Error {
  constructor(filename: unknown) {
    super(
      typeof filename === "string"
        ? `Unsafe filename: ${filename}`
        : "Unsafe filename",
    );
    this.name = "UnsafeFilenameError";
  }
}

export function assertSafeFilename(filename: string): void {
  if (
    typeof filename !== "string" ||
    filename.length === 0 ||
    filename.length > 255 ||
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\") ||
    !SAFE_FILENAME.test(filename)
  ) {
    throw new UnsafeFilenameError(filename);
  }
}
