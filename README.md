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

## Lawyer comments on question pages

ความเห็นจากทนายบน `/docs/questions/[issueId]` เก็บใน Turso และต้องตั้งค่า
environment variables ต่อไปนี้ใน Vercel ทั้ง Preview และ Production:

```bash
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
COMMENT_IP_HASH_SALT=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

สร้างตารางก่อน deploy โดยรันจากโฟลเดอร์ `docs`:

```bash
turso db shell <database-name> < scripts/question-comments-schema.sql
```

ตั้งค่า Cloudflare Turnstile ให้รับโดเมน `mattersolv-docs.vercel.app` แล้วตั้งงาน
สำรองข้อมูล Turso รายวันไปยังที่เก็บข้อมูลแยกต่างหาก ทดสอบการกู้คืนข้อมูลก่อน
เปิดให้ทนายใช้งานจริง

## Project Structure

- `docs/` แอปเอกสาร Next.js และหน้าเผยแพร่
- `requirements/` เอกสารต้นทางและข้อมูลอ้างอิงภายใน
- `output/pdf/` ไฟล์ PDF ที่สร้างจากเอกสาร Workflow
