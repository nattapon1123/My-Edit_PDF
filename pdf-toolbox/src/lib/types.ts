export type PageItem = {
  id: string
  fileId: string
  fileName: string
  fileColor: number
  kind: 'pdf' | 'image'  // ใหม่: หน้านี้มาจาก PDF หรือรูป
  pageIndex: number      // ถ้าเป็นรูป ใส่ 0
  thumb: string
  rotation: 0 | 90 | 180 | 270
}