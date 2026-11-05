export type Tool = {
  title: string
  desc: string
  to?: string // ไม่มี = ยังไม่ได้ทำ (แสดงป้าย "เร็วๆ นี้")
}

export type Category = {
  name: string
  tools: Tool[]
}

export const categories: Category[] = [
  {
    name: 'จัดระเบียบ PDF',
    tools: [
      { title: 'จัดการหน้า PDF', desc: 'รวมไฟล์ จัดเรียง ลบ และหมุนหน้า ด้วยการลากวาง', to: '/merge' },
      { title: 'ดึงหน้าด้วยเลขหน้า', desc: 'พิมพ์ช่วงหน้า เช่น 1-3, 5, 8-10 แล้วดึงออกมาเป็นไฟล์ใหม่', to: '/split' },
      { title: 'สแกนเป็น PDF', desc: 'ถ่ายรูปเอกสารด้วยกล้อง ปรับขาวดำ/ความสว่าง แล้วรวมเป็น PDF', to: '/scan' },
    ],
  },
  {
    name: 'เพิ่มประสิทธิภาพ',
    tools: [
      { title: 'บีบอัด / ย่อ / แปลงรูป', desc: 'ลดขนาดไฟล์รูป ย่อขนาด และแปลงเป็น JPG, PNG, WebP', to: '/image' },
      { title: 'บีบอัด PDF', desc: 'ลดขนาดไฟล์ PDF' },
      { title: 'ซ่อม PDF', desc: 'กู้ไฟล์ PDF ที่เสีย ซ่อมโครงสร้างไฟล์ หรือสร้างใหม่จากภาพของแต่ละหน้า', to: '/repair' },
      { title: 'OCR PDF', desc: 'แปลงไฟล์สแกนเป็น PDF ที่ค้นหาและคัดลอกข้อความได้ รองรับไทยและอังกฤษ', to: '/ocr' },
    ],
  },
  {
    name: 'แปลงเป็น PDF',
    tools: [
      { title: 'JPG เป็น PDF', desc: 'ใช้ได้แล้วในหน้า "จัดการหน้า PDF" โยนรูปลงไปได้เลย', to: '/merge' },
      { title: 'WORD เป็น PDF', desc: 'แปลงเอกสาร Word' },
      { title: 'POWERPOINT เป็น PDF', desc: 'แปลงสไลด์' },
      { title: 'EXCEL เป็น PDF', desc: 'แปลงตารางคำนวณ' },
      { title: 'HTML เป็น PDF', desc: 'แปลงหน้าเว็บ' },
    ],
  },
  {
    name: 'แปลงจาก PDF',
    tools: [
      { title: 'PDF เป็นรูป', desc: 'แปลงหน้า PDF เป็น JPG หรือ PNG เลือกความละเอียดได้', to: '/pdf-to-image' },
      { title: 'PDF เป็น WORD', desc: 'แปลงเป็นเอกสาร Word' },
      { title: 'PDF เป็น POWERPOINT', desc: 'แปลงเป็นสไลด์' },
      { title: 'PDF เป็น EXCEL', desc: 'แปลงเป็นตาราง' },
      { title: 'PDF เป็น PDF/A', desc: 'แปลงเพื่อเก็บถาวร' },
    ],
  },
  {
    name: 'แก้ไข PDF',
    tools: [
      { title: 'หมุน PDF', desc: 'หมุนหน้าได้ในหน้า "จัดการหน้า PDF"', to: '/merge' },
      { title: 'ใส่หมายเลขหน้า', desc: 'ใส่เลขหน้าลงในเอกสาร เลือกตำแหน่งและรูปแบบได้', to: '/page-numbers' },
      { title: 'ใส่ลายน้ำ', desc: 'ใส่ข้อความลายน้ำ ไทย/อังกฤษ เลือกสี ความโปร่งใส และมุมเอียงได้', to: '/watermark' },
      { title: 'ครอบตัด PDF', desc: 'ตัดขอบหน้าด้วยแถบเลื่อน ดูตัวอย่างสด เลือกหน้าที่จะตัดได้', to: '/crop' },
      { title: 'แก้ไข PDF', desc: 'เพิ่มข้อความ (ไทย/อังกฤษ) และรูปลงบนหน้า PDF ลากย้ายตำแหน่งและปรับขนาดได้', to: '/edit' },
    ],
  },
]