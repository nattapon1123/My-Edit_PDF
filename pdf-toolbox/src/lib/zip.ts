import JSZip from 'jszip'

export type ZipItem = { name: string; blob: Blob }

// ชื่อซ้ำกันในโฟลเดอร์เดียว เช่น a.jpg กับ a.jpg ให้ต่อเลขท้าย a (2).jpg
function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name)
    return name
  }
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  let n = 2
  while (used.has(`${base} (${n})${ext}`)) n++
  const result = `${base} (${n})${ext}`
  used.add(result)
  return result
}

export async function buildZip(items: ZipItem[]): Promise<Blob> {
  const zip = new JSZip()
  const used = new Set<string>()
  for (const item of items) {
    zip.file(uniqueName(item.name, used), item.blob)
  }
  return zip.generateAsync({ type: 'blob' })
}