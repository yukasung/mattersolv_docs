# MatterSolv Documentation

เอกสารกลางสำหรับทีม Product, Developer และ QA ของ MatterSolv

## Development

แอปเอกสารเป็น standalone Next.js + Nextra project โดยใช้ npm dependency ที่เผยแพร่บน npm

ติดตั้ง dependency:

```bash
cd docs
npm install
```

เปิดเอกสารในโหมดพัฒนา:

```bash
npm run dev
```

ตรวจสอบ production build:

```bash
npm run build
```

เริ่ม production server หลัง build:

```bash
npm run start
```

เนื้อหาเอกสารอยู่ที่ `docs/app/docs/` และสามารถเพิ่มหรือแก้ไขหน้า `.mdx` ได้โดยตรง

## Project Structure

- `docs/` แอปเอกสาร Next.js และหน้าเผยแพร่
- `requirements/` เอกสารต้นทางและข้อมูลอ้างอิงภายใน
- `output/pdf/` ไฟล์ PDF ที่สร้างจากเอกสาร Workflow
