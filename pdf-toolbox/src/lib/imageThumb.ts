export async function makeImageThumb(file: File, targetWidth = 160): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = targetWidth / bitmap.width
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = Math.max(1, Math.floor(bitmap.height * scale))
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.7)
  } finally {
    bitmap.close()
  }
}