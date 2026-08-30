# Employees Module Requirements Research

## Scope

`Employees` คือทะเบียนบุคลากรภายในสำนักงานกฎหมาย ครอบคลุมข้อมูลประจำตัวและการติดต่อ ข้อมูลการทำงาน ตำแหน่ง/ทีม คุณสมบัติวิชาชีพ สถานะการใช้งานระบบ และความสัมพันธ์กับงานของสำนักงาน โดยใช้ชื่อ `Employee` เป็นคำกลางสำหรับ Partner, Lawyer, Support, Admin และ Accounting ตามขอบเขตที่ผู้ใช้ยืนยัน

โมดูลนี้ไม่ครอบคลุม Payroll หรือ Leave เพราะ source แยก `Human Resource Management` ไว้สำหรับระบบคำนวณเงินเดือน (ภาษี ประกันสังคม กองทุน OT เบี้ยขยัน โบนัส Payslip และ Export/Report ทางบัญชี) กับระบบลาออนไลน์โดยเฉพาะ (`ALT Pro - P3 (MatterSolv).xlsx`, sheet `Sub-Module`, rows 217-223; module inventory ที่ `Main-Module`, row 10)

## Source Findings

### Employee Registry and Lifecycle

- ต้องเพิ่ม แก้ไข และลบสมาชิกได้ โดยข้อมูลหลักที่ source ระบุคือชื่อ ตำแหน่ง ใบอนุญาต และทักษะเฉพาะ (`MTS_Feature Detail(2).pdf`, หน้า 6, หัวข้อ 5 “ทีมทนายความ”, ข้อ 1)
- ต้องมีโปรไฟล์ที่แสดงความเชี่ยวชาญ บทบาท และ Workload รวมถึงจัดโครงสร้างทีมตาม Partner / Associate / Support (`MTS_Feature Detail(2).pdf`, หน้า 7, ข้อ 1)
- ต้องรองรับ lifecycle อย่างน้อย Onboard และ Deactivate; เมื่อเพิ่ม User ใหม่ให้กำหนดสิทธิ์ตามบทบาท และเมื่อเปลี่ยน Role หรือสถานะให้ปรับสิทธิ์อัตโนมัติ (`MTS_Feature Detail(2).pdf`, หน้า 7, ข้อ 2 และ 4)
- Source ใช้คำว่า “ลบ” และ “Deactivate” พร้อมกัน แต่ไม่ระบุว่าการลบเป็น hard delete หรือ soft delete จึงควรกำหนดเป็นประเด็นตัดสินใจก่อน implementation

### Profile Data

Mockup ฟอร์มแก้ไขข้อมูลกำหนด field ที่ควรรองรับดังนี้ (`แก้ไขข้อมูลทนาย.pdf`, หน้า 1):

- รูปโปรไฟล์ (ไฟล์ไม่เกิน 50 MB)
- แผนก คำนำหน้า ชื่อ นามสกุล และตำแหน่งได้สูงสุด 3 ตำแหน่ง
- เลขบัตรประชาชน เลขหนังสือเดินทาง โทรศัพท์ อีเมล LINE ID และ WeChat
- ที่อยู่ตามบัตรประชาชน และที่อยู่ติดต่อ โดยเลือกใช้ที่อยู่เดียวกันได้
- ความถนัดทางภาษา ข้อมูลเพิ่มเติม และไฟล์แนบได้สูงสุด 10 ไฟล์ ไฟล์ละไม่เกิน 50 MB
- ใบอนุญาตทนายความ: สถานะไม่มีใบอนุญาต/มีใบอนุญาต เลขที่ใบอนุญาต วันหมดอายุ และไฟล์แนบ
- ใบอนุญาตอื่นหลายรายการ: ชื่อ เลขที่ ประเภทตลอดชีพ/ชั่วคราว วันหมดอายุ และไฟล์แนบ
- ค่าบริการวิชาชีพต่อชั่วโมง (THB/Hr.) สำหรับงานที่คิดค่าบริการรายชั่วโมง

ข้อมูลเลขบัตรประชาชน หนังสือเดินทาง ที่อยู่ และไฟล์ใบอนุญาตเป็นข้อมูลอ่อนไหว จึงต้องแยก Permission สำหรับดู/แก้ไขและบันทึก Audit Log; source security ระบุ RBAC, Individual Permissions และ Audit Log ไว้แล้ว (`Action Plan MatterSolv Project.xlsx`, sheet `Action Plan MatterSolv `, rows 208-214)

### Detail View and Work Relationships

- หน้ารายละเอียดต้องแสดงรหัสบุคลากร (ตัวอย่าง `LAW-00001`) ข้อมูลส่วนตัว/ติดต่อ แผนก ตำแหน่ง ภาษา ใบอนุญาต และค่าบริการวิชาชีพ (`รายละเอียดทนายความ - 1.pdf`, หน้า 1)
- โปรไฟล์เชื่อมไปยังรายการคดีความ งานด้านกฎหมาย งานทั้งหมด ปฏิทิน และเอกสารของบุคลากร (`รายละเอียดทนายความ - 1.pdf`, หน้า 1, ชุดแท็บด้านล่างโปรไฟล์)
- `Matter` (แฟ้มงานกฎหมาย) ต้องกำหนดทีมทำงานและบทบาทได้ และ LOE ต้องเก็บชื่อทีมทนายที่รับผิดชอบ (`MTS_Feature Detail(2).pdf`, หน้า 8, หัวข้อ 7 ข้อ 1; `Letter of Engagement (LOE)(1).docx`, ย่อหน้า 9)

### Roles and Access

- Action vocabulary ของเมนูประกอบด้วย ดู, สร้าง/เพิ่ม, แก้ไข, ลบ และอนุมัติ (`Role and Permission Alternate Pro_1.xlsx`, sheet `Role & Permission`, row 1)
- Source persona ได้แก่ Owner, Admin, Partner, Managing Partner, Senior Lawyer, Junior Lawyer และ Accounting (`Role and Permission Alternate Pro_1.xlsx`, sheet `Role & Permission`, rows 2-8)
- สำหรับเมนู “ทนายความ” matrix ระบุ Owner และ Admin ทำ View/Create/Edit/Delete ได้; Partner, Senior/Junior Lawyer และ Accounting เป็น View-only (`Role and Permission Alternate Pro_1.xlsx`, sheet `Role & Permission`, rows 21, 43, 64, 86 และ 108)
- Persona จาก workbook เป็น business persona/reference ไม่ควรถูกใช้เป็น runtime role โดยตรงโดยไม่มี mapping; `Managing Partner` ไม่มี permission block แยก และ Senior/Junior ใช้ block เดียวกัน (`requirements/analysis/roles-plans-source-authority-baseline.md`, หัวข้อ `DEC-RBAC-002` และ `Known Gaps Requiring Explicit Resolution`)

### Workload and Performance Integration

- Employees ต้องดึงข้อมูลชั่วโมงจาก Timesheet เพื่อคำนวณ Performance และรายงานทีม โดยแสดงงาน ชั่วโมงทำงาน Billable Rate, Workload และ Billable Hours รายบุคคล/ทีม (`MTS_Feature Detail(2).pdf`, หน้า 7, ข้อ 3-4)
- รายงานทีมมีตัวกรองช่วงเวลา สรุปงานทั้งหมด/งานค้าง/งานเกินกำหนด/ปิดงานแล้ว ตารางรายบุคคล (จำนวนคดี งานกฎหมาย เคสที่จบ/คงเหลือ งานทั้งหมด) และภาระงานรายวัน (`ภาระงานและประสิทธิภาพทีม.pdf`, หน้า 1)
- รายงานประสิทธิภาพเปรียบเทียบชั่วโมงจริงกับชั่วโมงประเมิน ทั้งรายทนายและรายคดี พร้อมต้นทุน มูลค่าเรียกเก็บ และกำไร (`ประสิทธิภาพการทำงาน.pdf`, หน้า 1)
- Source ต้องการให้ Partner มองเห็นว่าใครงานหนักหรือยังว่าง เพื่อช่วยมอบหมายงาน (`MTS_Feature Detail(2).pdf`, หน้า 13, หัวข้อ 11 ข้อ 4)

## Proposed Module Boundary

### In Employees

- Employee list, search/filter และ profile/detail
- Create, edit, deactivate และการจัดการสถานะบัญชีผู้ใช้
- Identity/contact, department, positions, languages, skills/expertise
- Professional licenses, expiry, attachments และ hourly professional rate
- Team structure และ Role/Permission assignment linkage
- Read-only linked views ของ Matters, legal services, Tasks, calendar, documents, Timesheets และ performance/workload

### Outside Employees

- Payroll, tax, social security, funds, OT, bonus, Payslip และ payroll accounting export
- Leave request, leave balance, approval และ leave calendar
- การคำนวณ Timesheet/Billing/Performance โดยตรง; Employees เป็นเจ้าของตัวบุคลากรและแสดงผลข้อมูลที่โมดูลต้นทางคำนวณ
- การนิยาม permission catalog และ security policy ระดับระบบ; Employees เลือก Role/bundle ที่ Settings/Security เป็นเจ้าของ

## Ambiguities and Decisions Needed

1. **Employee type:** Mockup ลงรายละเอียดเฉพาะทนาย ขณะที่ requirement ระบุ Partner / Associate / Support และ role source มี Admin/Accounting ด้วย ควรใช้ base employee profile ร่วมกัน แล้วแสดง license, expertise และ professional rate แบบ conditional สำหรับผู้ประกอบวิชาชีพ
2. **Missing employment fields:** Source ยังไม่ระบุ employee number format สำหรับบุคลากรที่ไม่ใช่ทนาย, วันที่เริ่มงาน/สิ้นสุดงาน, employment type, supervisor, office location หรือ reason for deactivation ห้ามกำหนดค่าเองจน Product ยืนยัน
3. **Delete semantics:** ต้องตัดสินใจว่า “ลบ” หมายถึง deactivate/archive หรือ hard delete โดยคำนึงถึง Matter, Timesheet, Billing และ Audit history ที่อ้างถึงบุคลากร
4. **Role assignment:** ยังไม่มี mapping ที่อนุมัติจาก source persona ไป runtime roles/bundles ครบทุกตำแหน่ง โดยเฉพาะ Managing Partner และการแยก Senior/Junior
5. **Sensitive-field visibility:** Source ระบุ security controls แต่ยังไม่มี field-level matrix สำหรับเลขประจำตัว ที่อยู่ ใบอนุญาต และ rate
6. **License expiry workflow:** Mockup มีวันหมดอายุและคำว่า “ต่ออายุ” แต่ไม่ระบุ reminder window, ผู้รับแจ้ง หรือสถานะหลังหมดอายุ
7. **Profile image:** `team profile.jpg` เป็น executive team profile ของโครงการ (CLO/CMO/CFO/CTO) ไม่ใช่ทะเบียนพนักงานสำนักงานกฎหมาย จึงไม่ใช้เป็น source สำหรับ Employees data model

## Recommended Minimum Documentation Set

- Employees Overview และขอบเขตเทียบกับ HR
- Employee List
- Create/Edit Employee
- Employee Detail
- Roles & Access linkage
- Licenses & Qualifications
- Workload & Performance linked view
- Employee lifecycle: Onboard, Deactivate และผลกระทบต่อข้อมูลที่เชื่อมโยง
