// แปลง "1-3, 5, 8-10" เป็น [0,1,2,4,7,8,9] (index เริ่มที่ 0)
export function parsePageRange(input: string, totalPages: number): number[] {
  const result: number[] = []
  const parts = input.split(',').map((s) => s.trim()).filter(Boolean)

  for (const part of parts) {
    const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!match) throw new Error(`รูปแบบไม่ถูกต้อง: "${part}"`)

    const start = parseInt(match[1], 10)
    const end = match[2] ? parseInt(match[2], 10) : start

    if (start < 1 || end > totalPages || start > end) {
      throw new Error(`ช่วงหน้า "${part}" อยู่นอกขอบเขต (ไฟล์มี ${totalPages} หน้า)`)
    }
    for (let p = start; p <= end; p++) result.push(p - 1)
  }

  if (result.length === 0) throw new Error('กรุณาระบุหน้าที่ต้องการ')
  return result
}