import os
import subprocess
import tempfile
from typing import Literal

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

app = FastAPI(title="PDF Toolbox API")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://YOUR-SITE.pages.dev",  # ใส่โดเมนจริงทีหลัง
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    # ให้หน้าเว็บอ่าน header ขนาดไฟล์ได้
    expose_headers=[
        "Content-Disposition",
        "X-Original-Size",
        "X-Compressed-Size",
        "X-Compression-Status",
    ],
)

MAX_SIZE = 50 * 1024 * 1024  # 50 MB

# ระดับที่ผู้ใช้เลือก -> preset ของ Ghostscript
GS_PRESETS = {
    "low": "/prepress",   # คุณภาพสูง ลดขนาดน้อย
    "medium": "/ebook",   # สมดุล (ค่าเริ่มต้น)
    "high": "/screen",    # ลดขนาดมาก คุณภาพรูปต่ำลง
}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/compress")
async def compress(
    file: UploadFile = File(...),
    level: Literal["low", "medium", "high"] = "medium",
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="ต้องเป็นไฟล์ PDF เท่านั้น")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="ไฟล์ใหญ่เกิน 50 MB")

    with tempfile.TemporaryDirectory() as tmp:
        in_path = os.path.join(tmp, "input.pdf")
        out_path = os.path.join(tmp, "output.pdf")

        with open(in_path, "wb") as f:
            f.write(data)

        result = subprocess.run(
            [
                "gs",
                "-sDEVICE=pdfwrite",
                "-dCompatibilityLevel=1.5",
                f"-dPDFSETTINGS={GS_PRESETS[level]}",
                "-dNOPAUSE",
                "-dQUIET",
                "-dBATCH",
                f"-sOutputFile={out_path}",
                in_path,
            ],
            capture_output=True,
            timeout=120,
        )

        if result.returncode != 0 or not os.path.exists(out_path):
            raise HTTPException(status_code=500, detail="บีบอัดไม่สำเร็จ")

        with open(out_path, "rb") as f:
            compressed = f.read()

    # ถ้าบีบแล้วไม่เล็กลง ส่งไฟล์เดิมกลับ และแจ้งสถานะให้หน้าเว็บทราบ
    if len(compressed) >= len(data):
        compressed = data
        status = "unchanged"
    else:
        status = "reduced"

    return Response(
        content=compressed,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="compressed.pdf"',
            "X-Original-Size": str(len(data)),
            "X-Compressed-Size": str(len(compressed)),
            "X-Compression-Status": status,
        },
    )