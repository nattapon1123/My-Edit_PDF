from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="PDF Toolbox API")

# อนุญาตให้หน้าเว็บเรียก API ได้
# เปลี่ยน URL ด้านล่างเป็นโดเมนจริงของ Cloudflare Pages ตอน deploy
ALLOWED_ORIGINS = [
    "http://localhost:5173",          # Vite ตอนพัฒนา
    "https://YOUR-SITE.pages.dev",    # ใส่โดเมนจริงทีหลัง
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}