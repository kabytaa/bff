export function assetFileAddress(publicId: string): string {
  return `/v1/files/assets/${encodeURIComponent(publicId)}`;
}

export function exportFileAddress(publicId: string): string {
  return `/v1/files/exports/${encodeURIComponent(publicId)}`;
}
