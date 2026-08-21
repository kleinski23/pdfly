export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function downloadBytes(bytes: ArrayBuffer, name: string): void {
  downloadBlob(new Blob([bytes], { type: 'application/pdf' }), name)
}
