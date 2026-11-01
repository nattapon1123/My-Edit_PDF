export type PageItem = {
  id: string          // id ไม่ซ้ำ ใช้กับลากวาง
  fileId: string      // มาจากไฟล์ไหน (ไว้หาไฟล์ต้นฉบับตอนรวม)
  fileName: string    // ชื่อไฟล์ (ไว้แสดงบนหน้า)
  fileColor: number   // ลำดับสีของไฟล์ (0,1,2,...)
  pageIndex: number   // หน้าที่เท่าไหร่ในไฟล์นั้น (เริ่ม 0)
  thumb: string       // ภาพย่อ (data URL)
  rotation: 0 | 90 | 180 | 270  // เผื่อสเต็ปหมุนหน้าทีหลัง
}