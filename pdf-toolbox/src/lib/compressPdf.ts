const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export type CompressLevel = 'low' | 'medium' | 'high'

export type CompressResult = {
  blob: Blob
  originalSize: number
  compressedSize: number
  status: 'reduced' | 'unchanged'
}

export async function compressPdf(
  file: File,
  level: CompressLevel
): Promise<CompressResult> {
  const form = new FormData()
  form.append('file', file)

  let res: Response
  try {
    res = await fetch(`${API_URL}/compress?level=${level}`, {
      method: 'POST',
      body: form,
    })
  } catch {
    // fetch จะ throw ก็ต่อเมื่อเชื่อมต่อเซิร์ฟเวอร์ไม่ได้
    throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจว่า backend กำลังรันอยู่')
  }

  if (!res.ok) {
    let detail = 'บีบอัดไม่สำเร็จ'
    try {
      const body = await res.json()
      if (body.detail) detail = body.detail
    } catch {
      // ไม่ใช่ JSON ก็ใช้ข้อความเริ่มต้น
    }
    throw new Error(detail)
  }

  const blob = await res.blob()
  return {
    blob,
    originalSize: Number(res.headers.get('X-Original-Size') ?? file.size),
    compressedSize: Number(res.headers.get('X-Compressed-Size') ?? blob.size),
    status:
      res.headers.get('X-Compression-Status') === 'unchanged'
        ? 'unchanged'
        : 'reduced',
  }
}