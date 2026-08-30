import type { Question } from './questions.ts'

type EmployeeQuestionInput = Pick<
  Question,
  'id' | 'title' | 'description' | 'priority' | 'labels' | 'relatedModules'
>

function employeeQuestion(input: EmployeeQuestionInput): Question {
  return {
    ...input,
    createdAt: '',
    updatedAt: '',
    status: 'Backlog',
    statusType: 'backlog',
    parentId: 'html',
    primaryModule: 'employees',
    source: 'html'
  }
}

export const employeeQuestions: Question[] = [
  employeeQuestion({
    id: 'DEV-195',
    title: '[คำถาม] ข้อมูลพนักงานและบัญชีผู้ใช้ควรเป็นข้อมูลชุดเดียวกันหรือแยกกัน?',
    description: `## เหตุผลที่ต้องสอบถาม

เอกสารต้นทางแยกการจัดการบุคลากรออกจากการสร้าง User และกำหนดสิทธิ์ แต่หน้า Employees ปัจจุบันรวมข้อมูลพนักงาน บทบาท และสิทธิ์เข้าโมดูลไว้ในฟอร์มเดียวกัน จึงยังไม่ชัดว่าพนักงานทุกคนต้องเข้าสู่ระบบหรือไม่

## คำถาม

Employee record กับ User account ควรเป็น entity เดียวกันหรือแยกกัน และควรเชื่อมกันเมื่อใด?

## ตัวเลือก

* เป็นข้อมูลชุดเดียวกัน และพนักงานทุกคนมีบัญชีผู้ใช้เสมอ
* แยกกัน โดยสร้าง Employee ก่อนแล้วเชิญหรือสร้าง User ภายหลัง
* แยกกัน แต่สร้าง User อัตโนมัติเฉพาะตำแหน่งที่ต้องใช้งานระบบ

## ผลกระทบ

* โครงสร้างข้อมูล การสร้างและแก้ไขพนักงาน
* ขั้นตอนเชิญผู้ใช้ การปิดบัญชี และการกำหนดสิทธิ์
* การรองรับบุคลากรที่ไม่จำเป็นต้องเข้าสู่ระบบ

## ที่มา

* \`requirements/source/MTS_Feature Detail(2).pdf\` หน้า 6–7: การจัดการสมาชิก, Onboard/Deactivate และการกำหนดสิทธิ์เมื่อเพิ่ม User
* \`requirements/source/MTS_Feature Detail(2).pdf\` หน้า 15 และ \`requirements/source/ข้อมูลเก่าจาก ALTPro/ALT Pro - P3 (MatterSolv).xlsx\` ชีต \`Sub-Module\` แถว 224–229, 248–258: User/RBAC อยู่ใน Settings และ Administration
* \`frontend/src/modules/entities/employees/types/index.ts\`, \`EmployeeInformationSection.tsx\` และ \`EmployeeAccessPermissionsTab.tsx\`: frontend รวมข้อมูลพนักงาน บทบาท และสิทธิ์ไว้ใน draft เดียว`,
    priority: 'Critical',
    labels: ['พนักงาน', 'บัญชีผู้ใช้', 'โครงสร้างข้อมูล'],
    relatedModules: ['administration']
  }),
  employeeQuestion({
    id: 'DEV-196',
    title: '[คำถาม] API และการบันทึกข้อมูล Employees ต้องรองรับ operation ใดบ้าง?',
    description: `## เหตุผลที่ต้องสอบถาม

frontend เรียก API เฉพาะรายการพนักงาน ขณะที่ add/edit ยังไม่บันทึกจริง การลบเกิดเฉพาะใน state ของหน้า และข้อมูล edit บางส่วนเป็นข้อมูลจำลอง จึงยังไม่มี contract ที่นำไปพัฒนา backend และเชื่อม flow ได้ครบ

## คำถาม

API และ persistence contract สำหรับ list, create, detail, update, deactivate, upload และ export ต้องมี endpoint, payload, validation และ error behavior อย่างไร?

## ตัวเลือก

* กำหนด REST endpoints แยกตาม operation พร้อม schema และ error code
* ใช้ command endpoint เดียวสำหรับ lifecycle และแยก query endpoints
* ส่งมอบเฉพาะ list/create/edit ในระยะแรก และจัดลำดับ deactivate/upload/export ในระยะถัดไป

## ผลกระทบ

* การเชื่อมหน้า list/add/edit กับข้อมูลจริง
* การจัดการ loading, validation, error และ refetch หลัง mutation
* ขอบเขต backend และ acceptance criteria ของ Employees

## ที่มา

* \`frontend/src/modules/entities/employees/api/employeeApi.ts\`: มีเฉพาะ GET \`/employees\`
* \`frontend/src/modules/entities/employees/pages/EmployeeFormPage.tsx\`: submit ตรวจ validation แต่ยังไม่มี mutation หรือ navigation
* \`frontend/src/modules/entities/employees/hooks/employeeEditDraft.ts\` และ \`useEmployeeTableController.ts\`: edit เติมข้อมูลจำลอง และ delete/bulk delete เปลี่ยนเฉพาะ local state
* \`requirements/source/MTS_Feature Detail(2).pdf\` หน้า 6–7: ระบุ add/edit/delete และ Onboard/Deactivate แต่ไม่ได้กำหนด API contract`,
    priority: 'Critical',
    labels: ['พนักงาน', 'API', 'การบันทึกข้อมูล'],
    relatedModules: ['administration']
  }),
  employeeQuestion({
    id: 'DEV-197',
    title: '[คำถาม] Delete, Archive และ Deactivate พนักงานมีความหมายและผลต่างกันอย่างไร?',
    description: `## เหตุผลที่ต้องสอบถาม

เอกสารใช้ทั้งคำว่า delete และ Deactivate ขณะที่พนักงานถูกอ้างอิงจากคดี เวลา บิล และรายงาน หากลบถาวรอาจทำให้ประวัติทางกฎหมายและการเงินไม่ครบถ้วน

## คำถาม

ระบบควรให้ลบถาวร, archive หรือ deactivate พนักงานในกรณีใด และแต่ละสถานะต้องกระทบบัญชีผู้ใช้กับข้อมูลอ้างอิงอย่างไร?

## ตัวเลือก

* ไม่ให้ลบถาวร ใช้ Deactivate และเก็บประวัติทั้งหมด
* Archive ใช้ซ่อนจากงานประจำ ส่วน Deactivate ใช้ปิดบัญชีผู้ใช้
* อนุญาต hard delete เฉพาะข้อมูลที่ยังไม่เคยถูกอ้างอิงและเฉพาะผู้ดูแลระบบ

## ผลกระทบ

* ความครบถ้วนของประวัติคดี เวลา บิล และรายงาน
* การเข้าสู่ระบบ การมอบหมายงาน และการแสดงพนักงานเดิม
* audit trail และนโยบายเก็บรักษาข้อมูล

## ที่มา

* \`requirements/source/MTS_Feature Detail(2).pdf\` หน้า 6–7: ระบุ add/edit/delete และ Onboard/Deactivate โดยไม่อธิบาย lifecycle
* \`requirements/source/MTS_Feature Detail(2).pdf\` หน้า 5–9, 13: พนักงานเชื่อมกับ Matter, Timesheet, Billing และ Performance
* \`frontend/src/modules/entities/employees/components/employeeTableColumns.tsx\`, \`EmployeeTable.tsx\` และ \`hooks/useEmployeeTableController.ts\`: มีลบรายแถว/หลายรายการและนำออกจาก local state ทันที`,
    priority: 'Critical',
    labels: ['พนักงาน', 'สถานะ', 'การลบข้อมูล'],
    relatedModules: ['matters', 'billing', 'reports', 'administration']
  }),
  employeeQuestion({
    id: 'DEV-198',
    title: '[คำถาม] สิทธิ์ Employees ต้องแยกตาม action และควบคุมทั้ง route กับปุ่มใดบ้าง?',
    description: `## เหตุผลที่ต้องสอบถาม

permission matrix แยก view/create/edit/delete/approve แต่ frontend มีเพียง add_employee กับ view_employee, ใช้สิทธิ์ add กับหน้า edit และยังแสดงปุ่ม edit/delete โดยไม่ gate ตาม action

## คำถาม

Employees ต้องมี permission actions ใดบ้าง และแต่ละ action ต้องควบคุม route, ปุ่ม, bulk action, export และ field-sensitive access อย่างไร?

## ตัวเลือก

* ใช้ view/create/edit/delete ตาม permission matrix และเพิ่ม deactivate/export หากจำเป็น
* ใช้ manage permission เดียวสำหรับการเปลี่ยนแปลงทั้งหมด
* ใช้ role preset เป็นค่าเริ่มต้น แต่อนุญาต override permission รายผู้ใช้

## ผลกระทบ

* route guard และการแสดง action ในหน้า list/detail/form
* API authorization และการป้องกันการเรียกตรง
* permission matrix, test cases และ audit log

## ที่มา

* \`requirements/source/ข้อมูลเก่าจาก ALTPro/Role and Permission Alternate Pro_1.xlsx\` ชีต \`Role & Permission\` แถว 1, 21, 43, 64, 86, 108: action vocabulary และสิทธิ์เมนูทนายต่างกันตาม persona
* \`frontend/src/modules/entities/employees/permissions.ts\` และ \`routes.tsx\`: มี add_employee/view_employee และหน้า edit ใช้ add_employee
* \`frontend/src/modules/entities/employees/components/employeeTableColumns.tsx\` และ \`EmployeeTableToolbarActions.tsx\`: action edit/delete/export ยังไม่ถูก gate ราย action`,
    priority: 'Critical',
    labels: ['พนักงาน', 'สิทธิ์', 'RBAC'],
    relatedModules: ['administration']
  }),
  employeeQuestion({
    id: 'DEV-199',
    title: '[คำถาม] Position, Security Role และ Matter Assignment Role ต้องแยก catalog กันหรือไม่?',
    description: `## เหตุผลที่ต้องสอบถาม

เอกสารใช้คำเรียกโครงสร้างทีม persona สำหรับสิทธิ์ และบทบาทในคดีคนละบริบท แต่ frontend มีชุด Position และ Role ที่ทับซ้อนกันบางส่วน จึงเสี่ยงใช้ค่าหนึ่งแทนหลายความหมาย

## คำถาม

Position, security role และ matter assignment role เป็น master data แยกกันหรือไม่ ใครเป็นผู้ดูแล และค่าใดมีผลต่อสิทธิ์โดยอัตโนมัติ?

## ตัวเลือก

* แยกสาม catalog ชัดเจนและเชื่อมด้วย rule ที่กำหนดได้
* Position กำหนด security role เริ่มต้น แต่ assignment role เลือกต่อคดี
* ใช้ catalog เดียว โดยกำหนดความหมายและข้อจำกัดร่วมกัน

## ผลกระทบ

* โครงสร้างข้อมูลพนักงานและ permission assignment
* การมอบหมายทีมใน Matter และรายงานตามตำแหน่ง
* การย้ายตำแหน่งโดยไม่เปลี่ยนสิทธิ์หรือประวัติคดีโดยไม่ตั้งใจ

## ที่มา

* \`requirements/source/MTS_Feature Detail(2).pdf\` หน้า 7: โครงสร้างทีม Partner/Associate/Support
* \`requirements/source/ข้อมูลเก่าจาก ALTPro/Role and Permission Alternate Pro_1.xlsx\` ชีต \`Role & Permission\` แถว 2–8: persona Owner/Admin/Partner/Managing Partner/Senior Lawyer/Junior Lawyer/Accounting
* \`requirements/source/รวม Alternate Architecture.xlsx\` ชีต \`Requirement\` แถว 76: Matter assignment role ต้องรอรายการจาก Product และผู้ใช้เพิ่มเองไม่ได้
* \`frontend/src/modules/entities/employees/components/EmployeeInformationSection.tsx\`: Position และ Role ใช้ชุดค่าคนละชุดแต่มีชื่อทับซ้อน`,
    priority: 'Critical',
    labels: ['พนักงาน', 'ตำแหน่ง', 'บทบาท'],
    relatedModules: ['matters', 'administration']
  }),
  employeeQuestion({
    id: 'DEV-200',
    title: '[คำถาม] พนักงานหนึ่งคนมีได้สูงสุดสามตำแหน่งอย่างไร?',
    description: `## เหตุผลที่ต้องสอบถาม

mockup ระบุว่าสามารถเลือกได้สูงสุดสามตำแหน่ง แต่ frontend เก็บ position เป็นค่าเดียว จึงยังไม่ทราบว่าต้องมีตำแหน่งหลัก ลำดับ หรือช่วงเวลาการดำรงตำแหน่งหรือไม่

## คำถาม

หากพนักงานมีได้สูงสุดสามตำแหน่ง ต้องกำหนดตำแหน่งหลัก ลำดับ วันที่เริ่ม/สิ้นสุด และประวัติการเปลี่ยนตำแหน่งอย่างไร?

## ตัวเลือก

* เก็บหลายตำแหน่งพร้อมระบุตำแหน่งหลักหนึ่งรายการ
* เก็บหลายตำแหน่งเท่าเทียมกันโดยไม่มีตำแหน่งหลัก
* ระยะแรกเก็บตำแหน่งเดียว และเลื่อนการรองรับหลายตำแหน่ง

## ผลกระทบ

* schema และ component เลือกตำแหน่ง
* permission default, การแสดงชื่อ และรายงานบุคลากร
* ประวัติการย้ายตำแหน่งและข้อมูลย้อนหลัง

## ที่มา

* \`requirements/source/รายงาน/แก้ไขข้อมูลทนาย.pdf\` หน้า 1: ระบุ “ตำแหน่ง (สูงสุด 3 ตำแหน่ง)”
* \`frontend/src/modules/entities/employees/types/index.ts\` และ \`EmployeeInformationSection.tsx\`: เก็บและเลือก position เป็นค่าเดียว`,
    priority: 'High',
    labels: ['พนักงาน', 'ตำแหน่ง', 'ประวัติ'],
    relatedModules: ['reports', 'administration']
  }),
  employeeQuestion({
    id: 'DEV-201',
    title: '[คำถาม] Department, Team และ Supervisor ต้องใช้ master data และความสัมพันธ์แบบใด?',
    description: `## เหตุผลที่ต้องสอบถาม

mockup มีแผนก แต่ไม่ได้กำหนด catalog หรือโครงสร้างทีม ขณะที่ frontend hardcode รายการแผนก จึงยังไม่รองรับชื่อจริงของสำนักงาน การย้ายทีม หรือหัวหน้างานอย่างเป็นระบบ

## คำถาม

Department, team และ supervisor ต้องเป็น master data ระดับสำนักงานหรือไม่ พนักงานอยู่ได้หลายทีมไหม และต้องเก็บประวัติการย้ายหรือไม่?

## ตัวเลือก

* หนึ่ง department หนึ่ง primary team และหนึ่ง supervisor ต่อพนักงาน
* รองรับหลาย team พร้อมกำหนดสัดส่วนหรือทีมหลัก
* ใช้ department เท่านั้นในระยะแรก และเพิ่ม team/supervisor ภายหลัง

## ผลกระทบ

* หน้าจัดการ master data และ validation ในฟอร์มพนักงาน
* การมอบหมายงาน การอนุมัติ และรายงานตามหน่วยงาน
* ประวัติองค์กรเมื่อพนักงานย้ายทีม

## ที่มา

* \`requirements/source/รายงาน/แก้ไขข้อมูลทนาย.pdf\` หน้า 1: มีฟิลด์แผนกและตัวอย่าง “ศาล” แต่ไม่มี catalog
* \`frontend/src/modules/entities/employees/components/EmployeeInformationSection.tsx\`: hardcode แผนกศาล/แพ่ง/อาญา/บัญชี
* \`requirements/source/MTS_Feature Detail(2).pdf\` หน้า 7: กล่าวถึง team structure โดยไม่กำหนด department/team/supervisor model`,
    priority: 'High',
    labels: ['พนักงาน', 'แผนก', 'ทีม'],
    relatedModules: ['reports', 'administration']
  }),
  employeeQuestion({
    id: 'DEV-202',
    title: '[คำถาม] รหัสพนักงานต้องสร้างอัตโนมัติหรือให้กรอกเอง?',
    description: `## เหตุผลที่ต้องสอบถาม

mockup รายละเอียดใช้รูปแบบ LAW-00001 แต่ fixture frontend ใช้ E00001 และฟอร์มบังคับให้ผู้ใช้กรอก จึงยังไม่มีหลักเกณฑ์เดียวสำหรับการสร้างและตรวจความซ้ำ

## คำถาม

รหัสพนักงานต้องสร้างอัตโนมัติหรือกรอกเอง ใช้ prefix/sequence ระดับใด และแก้ไขหลังสร้างได้หรือไม่?

## ตัวเลือก

* ระบบสร้างอัตโนมัติแบบลำดับเดียวต่อสำนักงาน
* ระบบสร้างตามประเภทหรือตำแหน่ง เช่น LAW และ STAFF
* ให้ผู้ใช้กรอกเองแต่ตรวจ uniqueness ภายใน tenant

## ผลกระทบ

* create flow, validation และ concurrency ของเลขลำดับ
* การนำเข้าข้อมูลเดิมและการอ้างอิงในเอกสาร
* การเปลี่ยนรหัสโดยไม่ทำให้ลิงก์หรือประวัติขาด

## ที่มา

* \`requirements/source/ทนายความ/การเรียงข้อมูลในหน้ารายละเอียด/รายละเอียดทนายความ - 1.pdf\` หน้า 1: ตัวอย่างรหัส LAW-00001
* \`frontend/src/modules/entities/employees/__fixtures__/employees.ts\`: ใช้รหัสรูปแบบ E00001
* \`frontend/src/modules/entities/employees/components/EmployeeInformationSection.tsx\` และ \`hooks/useEmployeeCreateForm.ts\`: ผู้ใช้ต้องกรอกรหัสและฟิลด์เป็น required`,
    priority: 'High',
    labels: ['พนักงาน', 'รหัสพนักงาน', 'ข้อมูลหลัก'],
    relatedModules: ['administration']
  }),
  employeeQuestion({
    id: 'DEV-203',
    title: '[คำถาม] เอกสารยืนยันตัวตนต้องรองรับหลายประเภทและกฎตามประเทศอย่างไร?',
    description: `## เหตุผลที่ต้องสอบถาม

mockup แสดงเลขบัตรประชาชนและหนังสือเดินทางพร้อมกัน แต่ frontend บังคับเลือกอย่างใดอย่างหนึ่งและยังไม่มีประเทศหรือสัญชาติสำหรับกำหนด validation

## คำถาม

พนักงานหนึ่งคนเก็บเอกสารยืนยันตัวตนได้กี่รายการ และ required fields/รูปแบบเลข/วันหมดอายุต้องเปลี่ยนตามประเทศหรือสัญชาติอย่างไร?

## ตัวเลือก

* รองรับบัตรประชาชนและ passport พร้อมกัน โดยเลือกเอกสารหลักหนึ่งรายการ
* คนไทยใช้บัตรประชาชน ต่างชาติใช้ passport ตามสัญชาติ
* รองรับ identity document แบบหลายประเภทจาก master data พร้อมประเทศผู้ออก

## ผลกระทบ

* schema, validation และการตรวจข้อมูลซ้ำ
* required fields สำหรับคนไทยและต่างชาติ
* การปกปิดข้อมูลสำคัญและการแจ้งเตือนวันหมดอายุ

## ที่มา

* \`requirements/source/รายงาน/แก้ไขข้อมูลทนาย.pdf\` หน้า 1: แสดงเลขบัตรประชาชนและหนังสือเดินทางในข้อมูลพนักงาน
* \`frontend/src/modules/entities/employees/components/EmployeeInformationSection.tsx\` และ \`hooks/useEmployeeCreateForm.ts\`: เลือก identity type อย่างใดอย่างหนึ่งและบังคับเลขเอกสาร แต่ไม่มี country/nationality`,
    priority: 'High',
    labels: ['พนักงาน', 'เอกสารยืนยันตัวตน', 'ข้อมูลส่วนบุคคล'],
    relatedModules: ['administration']
  }),
  employeeQuestion({
    id: 'DEV-204',
    title: '[คำถาม] ช่องทางติดต่อและที่อยู่ใดเป็นข้อมูลบังคับ และต้องรองรับต่างประเทศหรือไม่?',
    description: `## เหตุผลที่ต้องสอบถาม

mockup มีเบอร์ต่อ WeChat หมู่ และที่อยู่สองชุด แต่ frontend ไม่มีบางฟิลด์และบังคับซอยซึ่ง mockup ไม่ได้ระบุว่าจำเป็น อีกทั้ง address model ดูเป็นรูปแบบประเทศไทยเท่านั้น

## คำถาม

Phone extension, LINE, WeChat, ที่อยู่ตามทะเบียน และที่อยู่ปัจจุบัน ฟิลด์ใดบังคับ และต้องใช้ address format ตามประเทศหรือเฉพาะประเทศไทย?

## ตัวเลือก

* รองรับไทยเท่านั้นและกำหนด required fields ชุดเดียว
* รองรับ country-aware address และ validation ตามประเทศ
* เก็บที่อยู่เป็นข้อความอิสระสำหรับต่างประเทศ พร้อม structured address สำหรับไทย

## ผลกระทบ

* form fields, validation และ API schema
* การค้นหา ส่งเอกสาร และแสดงข้อมูลติดต่อ
* migration ของข้อมูลที่ frontend รองรับอยู่แล้ว

## ที่มา

* \`requirements/source/รายงาน/แก้ไขข้อมูลทนาย.pdf\` หน้า 1: มีเบอร์ต่อ, LINE, WeChat, หมู่ และที่อยู่ตามทะเบียน/ปัจจุบัน
* \`frontend/src/modules/entities/employees/components/EmployeeContactInformationSection.tsx\` และ \`EmployeeAddressFieldset.tsx\`: ไม่มี WeChat/เบอร์ต่อ/หมู่ และบังคับซอยใน address form`,
    priority: 'High',
    labels: ['พนักงาน', 'ข้อมูลติดต่อ', 'ที่อยู่'],
    relatedModules: []
  }),
  employeeQuestion({
    id: 'DEV-205',
    title: '[คำถาม] ใบอนุญาต ความเชี่ยวชาญ และอัตราค่าบริการวิชาชีพใช้กับพนักงานใดบ้าง?',
    description: `## เหตุผลที่ต้องสอบถาม

requirements ระบุ license และ specialized skills ส่วน mockup เพิ่มสถานะใบอนุญาต เอกสารแนบ และ professional rate แต่ employee draft ปัจจุบันยังไม่มีข้อมูลเหล่านี้ จึงต้องกำหนด scope และความหมายก่อนออกแบบข้อมูล

## คำถาม

ข้อมูล professional licenses, expertise และ professional rate ต้องใช้กับตำแหน่งใด เก็บได้กี่รายการ และ rate หมายถึงต้นทุนภายใน อัตราเรียกเก็บลูกความ หรือทั้งสองอย่าง?

## ตัวเลือก

* ใช้เฉพาะทนาย และแยก cost rate กับ billing rate
* ใช้กับทุกวิชาชีพ โดยประเภท license/skill กำหนดจาก master data
* เก็บเฉพาะ license และ expertise ใน Employees ส่วน rate จัดการใน Billing

## ผลกระทบ

* employee schema และเงื่อนไขแสดงฟอร์มตามตำแหน่ง
* quotation/billing calculation และสิทธิ์เห็นอัตรา
* การค้นหาทนายจากความเชี่ยวชาญและรายงานคุณสมบัติ

## ที่มา

* \`requirements/source/MTS_Feature Detail(2).pdf\` หน้า 6: ระบุ license และ specialized skills
* \`requirements/source/รายงาน/แก้ไขข้อมูลทนาย.pdf\` หน้า 1: มีใบอนุญาตทนาย ใบอนุญาตอื่น หมายเหตุ เอกสารแนบ และอัตราค่าวิชาชีพต่อชั่วโมง
* \`frontend/src/modules/entities/employees/types/index.ts\`: draft ยังไม่มี license, expertise, note, attachment หรือ professional rate`,
    priority: 'High',
    labels: ['พนักงาน', 'ใบอนุญาต', 'อัตราวิชาชีพ'],
    relatedModules: ['billing', 'quotations', 'reports']
  }),
  employeeQuestion({
    id: 'DEV-206',
    title: '[คำถาม] ระบบต้องจัดการวันหมดอายุ การแจ้งเตือน และประวัติต่ออายุใบอนุญาตอย่างไร?',
    description: `## เหตุผลที่ต้องสอบถาม

mockup มีวันหมดอายุและปุ่มต่ออายุ แต่ไม่มีเงื่อนไขแจ้งเตือน ผู้รับผิดชอบ ผลเมื่อหมดอายุ หรือวิธีเก็บประวัติ จึงอาจกระทบการมอบหมายงานที่ต้องใช้ใบอนุญาต

## คำถาม

ต้องแจ้งเตือนก่อนใบอนุญาตหมดอายุกี่วัน แจ้งใคร ใบอนุญาตหมดอายุมีผลต่อการมอบหมายงานหรือไม่ และการต่ออายุต้องสร้างประวัติหรือเขียนทับ?

## ตัวเลือก

* แจ้งตามช่วงเวลาที่ตั้งค่าได้ เก็บ renewal history และเตือนพนักงานกับ supervisor
* แจ้งตามค่าคงที่ เก็บเฉพาะวันหมดอายุล่าสุด
* แสดงสถานะเท่านั้นโดยไม่แจ้งเตือนหรือบล็อก workflow

## ผลกระทบ

* notification scheduler และ preference
* license history, audit และเอกสารฉบับเดิม
* validation ตอนมอบหมายงานและรายงานใบอนุญาตใกล้หมดอายุ

## ที่มา

* \`requirements/source/ทนายความ/การเรียงข้อมูลในหน้ารายละเอียด/รายละเอียดทนายความ - 1.pdf\` หน้า 1: แสดงสถานะ วันหมดอายุ และ action ต่ออายุ
* \`requirements/source/MTS_Feature Detail(2).pdf\` หน้า 6: ต้องเก็บ professional license แต่ไม่กำหนด reminder/renewal policy`,
    priority: 'High',
    labels: ['พนักงาน', 'ใบอนุญาต', 'การแจ้งเตือน'],
    relatedModules: ['calendar', 'matters', 'reports']
  }),
  employeeQuestion({
    id: 'DEV-207',
    title: '[คำถาม] รูปโปรไฟล์และเอกสารแนบ Employees รองรับชนิดไฟล์และขนาดสูงสุดเท่าใด?',
    description: `## เหตุผลที่ต้องสอบถาม

mockup ระบุไฟล์สูงสุด 50 MB แต่ frontend จำกัดรูปโปรไฟล์ 5 MB และเพิ่มข้อกำหนดขนาด/ชนิดรูปที่ยังไม่พบใน source จึงต้องแยกกฎของรูปโปรไฟล์กับเอกสารวิชาชีพให้ชัดเจน

## คำถาม

รูปโปรไฟล์และเอกสารแนบแต่ละประเภทอนุญาตชนิดไฟล์ ขนาด จำนวนไฟล์ การ crop/resize และการสแกนความปลอดภัยอย่างไร?

## ตัวเลือก

* รูปโปรไฟล์ไม่เกิน 5 MB และเอกสารแนบไม่เกิน 50 MB ต่อไฟล์
* ใช้เพดานเดียว 50 MB แต่ระบบ resize รูปอัตโนมัติ
* กำหนดข้อจำกัดตาม attachment type จาก configuration

## ผลกระทบ

* client/server validation และข้อความแจ้งข้อผิดพลาด
* object storage, thumbnail และ antivirus scanning
* การรองรับ JPEG/PNG/WebP/HEIC/PDF และเอกสารใบอนุญาต

## ที่มา

* \`requirements/source/รายงาน/แก้ไขข้อมูลทนาย.pdf\` หน้า 1: ระบุไฟล์สูงสุด 50 MB และเอกสารแนบได้สูงสุด 10 ไฟล์
* \`frontend/src/modules/entities/employees/hooks/useEmployeeCreateForm.ts\`: จำกัดรูป 5 MB และรองรับ JPEG/PNG/WebP
* \`frontend/src/modules/entities/employees/locales/th.ts\`: แนะนำรูป 200×200 พิกเซล แต่ยังไม่พบข้อกำหนดนี้ใน source`,
    priority: 'Medium',
    labels: ['พนักงาน', 'รูปโปรไฟล์', 'ไฟล์แนบ'],
    relatedModules: ['documents']
  }),
  employeeQuestion({
    id: 'DEV-208',
    title: '[คำถาม] Employee tags เป็น requirement จริงหรือ metadata ที่ไม่จำเป็น?',
    description: `## เหตุผลที่ต้องสอบถาม

frontend มี tags เช่น สำคัญ เร่งด่วน และเอกสารครบ แต่ไม่พบ employee tags ใน requirements หรือ mockup และชุดคำดูคล้าย metadata จากโมดูลอื่น จึงเสี่ยงสร้างข้อมูลที่ไม่มีเจ้าของหรือวัตถุประสงค์

## คำถาม

Employee tags ต้องมีจริงหรือไม่ หากมี ใครสร้างและจัดการ tag ใช้กับ filter/report/workflow ใด และต้องจำกัดเป็นรายสำนักงานหรือไม่?

## ตัวเลือก

* ตัด tags ออกจาก Employees เพราะไม่มี requirement
* ใช้ tags แบบ free-form ระดับสำนักงานเพื่อค้นหาและกรอง
* ใช้ controlled tags จาก master data พร้อมสีและสิทธิ์จัดการ

## ผลกระทบ

* ความซับซ้อนของ employee schema และ list filters
* การจัดการ master data และข้อมูลซ้ำ
* ความชัดเจนของความหมาย เช่น “เร่งด่วน” สำหรับพนักงาน

## ที่มา

* \`frontend/src/modules/entities/employees/components/EmployeeInformationSection.tsx\` และ \`employeeTableColumns.tsx\`: ให้เลือกและแสดง employee tags
* \`frontend/src/modules/entities/employees/locales/th.ts\`: มี tags สำคัญ/เร่งด่วน/ติดตาม/เอกสารครบ
* \`requirements/source/รายงาน/แก้ไขข้อมูลทนาย.pdf\` หน้า 1: มีหมายเหตุและเอกสารแนบ แต่ไม่พบ employee tags`,
    priority: 'Medium',
    labels: ['พนักงาน', 'แท็ก', 'ข้อมูลเสริม'],
    relatedModules: ['reports']
  }),
  employeeQuestion({
    id: 'DEV-209',
    title: '[คำถาม] Employee list ต้องมีคอลัมน์ ตัวกรอง pagination และ export contract อย่างไร?',
    description: `## เหตุผลที่ต้องสอบถาม

frontend มีคอลัมน์และตัวกรองบางส่วน พร้อมปุ่ม export ที่ยังไม่มี behavior แต่ source ไม่ได้กำหนด list contract จึงยังตัดสินไม่ได้ว่าการค้นหา แบ่งหน้า และ export ต้องทำที่ client หรือ server

## คำถาม

รายการ Employees ต้องแสดงและกรองข้อมูลใด ใช้ server-side pagination/sort/search หรือไม่ และ export ต้องมี format, field set และนโยบายข้อมูลสำคัญอย่างไร?

## ตัวเลือก

* server-side list พร้อม filter/sort/pagination และ export ตาม filter ปัจจุบัน
* client-side list สำหรับข้อมูลขนาดเล็ก และ export ข้อมูลที่โหลดแล้ว
* กำหนด saved views/เลือกคอลัมน์ได้ และ export ตามสิทธิ์ราย field

## ผลกระทบ

* list API query contract และประสิทธิภาพ
* UX ของ search/filter/pagination และจำนวนผลลัพธ์
* ความปลอดภัยของข้อมูลในไฟล์ export

## ที่มา

* \`frontend/src/modules/entities/employees/components/employeeTableColumns.tsx\`: คอลัมน์รหัส ชื่อ โทรศัพท์ ตำแหน่ง tags และ actions
* \`frontend/src/modules/entities/employees/employeeTableFilters.ts\`: filter รหัส ชื่อ ตำแหน่ง และ role
* \`frontend/src/modules/entities/employees/components/EmployeeTableToolbarActions.tsx\`: มีปุ่ม export แต่ไม่มี handler
* \`requirements/source/MTS_Feature Detail(2).pdf\` หน้า 6–7: ระบุการจัดการบุคลากร แต่ไม่กำหนด list/export contract`,
    priority: 'High',
    labels: ['พนักงาน', 'รายการข้อมูล', 'ส่งออกข้อมูล'],
    relatedModules: ['reports', 'administration']
  }),
  employeeQuestion({
    id: 'DEV-210',
    title: '[คำถาม] Employee detail endpoint และหน้ารายละเอียดต้องแสดงข้อมูลใดในระยะแรก?',
    description: `## เหตุผลที่ต้องสอบถาม

หน้า edit ปัจจุบันเติมข้อมูลสำคัญบางส่วนขึ้นเอง และหน้า detail แสดงเพียงข้อมูลติดต่อพื้นฐาน ขณะที่ mockup รายละเอียดมีข้อมูลส่วนตัว วิชาชีพ อัตรา และแท็บที่เชื่อมหลายโมดูล

## คำถาม

detail endpoint ต้องคืนข้อมูลชุดใด หน้ารายละเอียด v1 ต้องแสดง section/tab ใด และข้อมูลคำนวณหรือข้อมูลสำคัญควรคืนเป็น projection แบบใด?

## ตัวเลือก

* endpoint เดียวคืน employee profile ครบทุก section ตามสิทธิ์
* แยก profile endpoint กับ endpoints ของ matters/work/calendar/documents
* ส่งมอบข้อมูลพื้นฐานและวิชาชีพก่อน แล้วเพิ่ม linked tabs ภายหลัง

## ผลกระทบ

* API response size, authorization และ loading state ราย section
* ความถูกต้องของหน้า detail/edit ที่ต้องเลิกใช้ข้อมูลจำลอง
* ขอบเขต MVP และ dependency กับโมดูลอื่น

## ที่มา

* \`frontend/src/modules/entities/employees/hooks/employeeEditDraft.ts\`: สร้าง identity, email, LINE และ address จำลองใน edit draft
* \`frontend/src/modules/entities/employees/pages/EmployeeViewPage.tsx\`: แสดงรหัส ชื่อ ตำแหน่ง role โทรศัพท์ email และ LINE
* \`requirements/source/ทนายความ/การเรียงข้อมูลในหน้ารายละเอียด/รายละเอียดทนายความ - 1.pdf\` หน้า 1: มีแผนก identity ที่อยู่ ภาษา ใบอนุญาต rate และ linked tabs`,
    priority: 'High',
    labels: ['พนักงาน', 'รายละเอียดพนักงาน', 'API'],
    relatedModules: ['matters', 'calendar', 'documents', 'billing']
  }),
  employeeQuestion({
    id: 'DEV-211',
    title: '[คำถาม] แท็บข้อมูลที่เชื่อมโยงควรอยู่หน้า Detail หรือ Edit และเปิดใช้งานเมื่อใด?',
    description: `## เหตุผลที่ต้องสอบถาม

mockup วางแท็บคดี งาน ปฏิทิน และเอกสารไว้ในรายละเอียดทนาย แต่ frontend ใช้ component เดียวใน Create/Edit และแสดงแท็บเหล่านี้พร้อมข้อความให้บันทึกก่อนแม้กำลังแก้ไขข้อมูลที่มีอยู่แล้ว

## คำถาม

linked tabs ควรอยู่หน้า Detail, Edit หรือทั้งสองหน้า และหลังสร้างพนักงานสำเร็จควร redirect/เปิดใช้งานแท็บอย่างไร?

## ตัวเลือก

* อยู่หน้า Detail เท่านั้น และ Create redirect ไป Detail หลังบันทึก
* อยู่ทั้ง Detail และ Edit แต่ Edit แก้เฉพาะ profile ส่วนแท็บเป็น read-only links
* ใช้หน้าเดียวแบบ profile workspace และเปิดแท็บเมื่อมี employee ID

## ผลกระทบ

* route structure และ navigation หลัง create/save
* การ reuse component และการโหลดข้อมูลจากหลายโมดูล
* ความสับสนระหว่างการแก้ profile กับการจัดการงานที่เชื่อมโยง

## ที่มา

* \`requirements/source/ทนายความ/การเรียงข้อมูลในหน้ารายละเอียด/รายละเอียดทนายความ - 1.pdf\` หน้า 1: มีแท็บคดี งานทั้งหมด ปฏิทิน และเอกสารในหน้ารายละเอียด
* \`frontend/src/modules/entities/employees/components/EmployeeContactInformationSection.tsx\` และ \`pages/EmployeeFormPage.tsx\`: Create/Edit ใช้ component เดียวและแท็บแจ้งให้บันทึกก่อนในทั้งสอง mode
* \`frontend/src/modules/entities/employees/pages/EmployeeViewPage.tsx\`: detail ปัจจุบันมีเฉพาะแท็บข้อมูลติดต่อ`,
    priority: 'High',
    labels: ['พนักงาน', 'รายละเอียดพนักงาน', 'การนำทาง'],
    relatedModules: ['matters', 'tasks', 'calendar', 'documents']
  }),
  employeeQuestion({
    id: 'DEV-212',
    title: '[คำถาม] Workload และ Performance เป็นหน้าที่ของ Employees หรือ Reports?',
    description: `## เหตุผลที่ต้องสอบถาม

requirements ของ Lawyer Management กล่าวถึง workload, performance, billable rate และ hours ขณะที่ mockup รายงานทีมมี metric เหล่านี้แยกต่างหาก แต่ frontend Employees ยังไม่มีข้อมูลดังกล่าว

## คำถาม

Employees ควรคำนวณและแสดง workload/performance เอง หรือแสดง summary/link จาก Reports และ metric ใดต้องเห็นได้ตามช่วงเวลาและสิทธิ์ใด?

## ตัวเลือก

* Employees แสดง summary และลิงก์ไป Reports ซึ่งเป็น source of truth
* Employees มี dashboard รายบุคคล ส่วน Reports รวมระดับทีม
* เก็บเฉพาะข้อมูลพื้นฐานใน Employees และย้าย metric ทั้งหมดไป Reports

## ผลกระทบ

* ownership ของสูตรคำนวณและ API aggregation
* การใช้ timesheet/matter/billing data และความสอดคล้องของตัวเลข
* สิทธิ์เข้าถึงข้อมูลประสิทธิภาพรายบุคคล

## ที่มา

* \`requirements/source/MTS_Feature Detail(2).pdf\` หน้า 7: Lawyer Management มี workload, performance review, billable rate และ hours
* \`requirements/source/รายงาน/ภาระงานและประสิทธิภาพทีม.pdf\` หน้า 1: มีรายงาน metric ภาระงานและประสิทธิภาพทีม
* \`frontend/src/modules/entities/employees/\`: หน้า list/add/edit/detail ปัจจุบันยังไม่มี workload หรือ performance`,
    priority: 'High',
    labels: ['พนักงาน', 'ภาระงาน', 'ประสิทธิภาพ'],
    relatedModules: ['reports', 'matters', 'billing']
  }),
  employeeQuestion({
    id: 'DEV-213',
    title: '[คำถาม] ข้อมูลสำคัญของพนักงานต้อง mask, audit และเก็บรักษาอย่างไร?',
    description: `## เหตุผลที่ต้องสอบถาม

Employees เก็บเลขเอกสาร ที่อยู่ ข้อมูลติดต่อ อัตราวิชาชีพ และสิทธิ์ระบบ แต่ source ยังรอยืนยันเรื่อง access control/sensitive data ขณะที่ frontend แสดงข้อมูลเหล่านี้ใน form เดียวโดยยังไม่เห็นกติกา mask หรือ audit

## คำถาม

ข้อมูล field ใดถือว่า sensitive ใครดูค่าเต็มได้ ต้อง mask/reveal อย่างไร action ใดต้อง audit และเมื่อพนักงานออกต้องเก็บ ลบ หรือ anonymize หลังระยะเวลาเท่าใด?

## ตัวเลือก

* ใช้ field-level permission พร้อม mask ค่าเริ่มต้นและบันทึกทุก reveal/export/change
* ใช้สิทธิ์ระดับ section และ audit เฉพาะการแก้ไข/ส่งออก
* จำกัด Employees ให้ HR/Admin เท่านั้นและไม่ทำ field-level masking ในระยะแรก

## ผลกระทบ

* PDPA, security model และ audit storage
* detail/list/export API และ UI reveal flow
* retention job, anonymization และการรักษาประวัติคดี/การเงิน

## ที่มา

* \`requirements/source/ข้อมูลเก่าจาก ALTPro/ALT Pro - P3 (MatterSolv).xlsx\` ชีต \`Sub-Module\` แถว 248–264: individual permissions, audit, PDPA และ retention
* \`requirements/source/รวม Alternate Architecture.xlsx\` ชีต \`Requirement\` แถว 170 และ 178: Access Control และ Sensitive Data ยังเป็น Waiting to Confirm
* \`frontend/src/modules/entities/employees/\`: identity, address และ permissions อยู่ใน employee flow โดยยังไม่พบ masking/audit behavior`,
    priority: 'High',
    labels: ['พนักงาน', 'ข้อมูลสำคัญ', 'การตรวจสอบย้อนหลัง'],
    relatedModules: ['administration', 'reports']
  }),
  employeeQuestion({
    id: 'DEV-214',
    title: '[คำถาม] เมื่อ requirement register กับ PDF หรือ mockup ขัดกัน ต้องยึดแหล่งใดเป็นหลัก?',
    description: `## เหตุผลที่ต้องสอบถาม

Feature Detail อธิบาย RBAC และการกำหนดสิทธิ์เสมือนเป็น requirement แล้ว แต่ architecture register ยังระบุว่า Access Control และ Sensitive Data รอยืนยัน จึงมีความเสี่ยงที่ทีมพัฒนาจะใช้ baseline คนละชุด

## คำถาม

เมื่อ requirement register, Feature Detail, spreadsheet, PDF/mockup และ frontend behavior ขัดกัน แหล่งใดเป็น source of truth และรายการ Waiting to Confirm ต้องหยุดพัฒนาจนอนุมัติหรือใช้สมมติฐานชั่วคราวได้?

## ตัวเลือก

* Requirement register ที่อนุมัติล่าสุดมีลำดับสูงสุด เอกสารอื่นเป็นหลักฐานประกอบ
* Mockup/Feature Detail ที่ Product ส่งล่าสุดใช้เป็น baseline จนกว่า register จะอัปเดต
* ใช้ decision log รายประเด็น พร้อม owner/version/date และห้ามอนุมานจาก frontend

## ผลกระทบ

* acceptance criteria และการตัดสินข้อ DEV-195–DEV-213
* การป้องกัน rework ของ schema, permissions และ sensitive data
* traceability ระหว่าง requirement, design และ implementation

## ที่มา

* \`requirements/source/MTS_Feature Detail(2).pdf\` หน้า 7: อธิบาย RBAC และ auto permission เป็น requirement
* \`requirements/source/รวม Alternate Architecture.xlsx\` ชีต \`Requirement\` แถว 170 และ 178: Access Control และ Sensitive Data ยังเป็น Waiting to Confirm
* \`frontend/src/modules/entities/employees/\`: มี behavior หลายส่วนที่ยังไม่พบข้อสรุปตรงกันใน source`,
    priority: 'High',
    labels: ['พนักงาน', 'แหล่งอ้างอิง', 'การตัดสินใจ'],
    relatedModules: ['administration']
  }),
  employeeQuestion({
    id: 'DEV-215',
    title: '[คำถาม] หน้าเพิ่มและแก้ไข Employees ต้องรองรับพนักงานทุกประเภทในบริษัทหรือไม่?',
    description: `## เหตุผลที่ต้องสอบถาม

เอกสารและ mockup เดิมบางส่วนอ้างอิงข้อมูลทนายความ แต่ Employees ถูกใช้เป็นทะเบียนบุคลากรของสำนักงานหรือบริษัท จึงต้องยืนยันว่าหน้าเพิ่มและแก้ไขใช้กับพนักงานทุกประเภท ไม่ได้จำกัดเฉพาะทนาย

## คำถาม

หน้าเพิ่มและแก้ไข Employees ต้องรองรับพนักงานทุกประเภทในบริษัทหรือไม่ และข้อมูลเฉพาะทนาย เช่น ใบอนุญาตทนาย ความเชี่ยวชาญ และอัตราค่าวิชาชีพ ควรแสดงตามประเภทพนักงานหรือตำแหน่งอย่างไร?

## ตัวเลือก

* ใช้ฟอร์ม Employees ชุดเดียวสำหรับทุกพนักงาน และแสดงข้อมูลวิชาชีพตามประเภทพนักงานหรือตำแหน่ง
* ใช้ฟอร์มพื้นฐานร่วมกัน แล้วแยกขั้นตอนหรือ section เฉพาะสำหรับทนายและวิชาชีพอื่น
* จำกัดฟอร์มระยะแรกไว้เฉพาะทนาย แล้วเพิ่มพนักงานประเภทอื่นในระยะถัดไป

## ผลกระทบ

* ชื่อและขอบเขตของ Employees รวมถึง create/edit flow
* schema, validation และเงื่อนไขแสดงข้อมูลวิชาชีพ
* การนำข้อมูลไปใช้กับ HR, การมอบหมายงาน และการกำหนดสิทธิ์

## ที่มา

* docs/app/docs/modules/employees/page.mdx: ระบุว่า Employees ครอบคลุม Partner, Lawyer, ผู้ช่วยทนาย ทีมธุรการ ฝ่ายการเงิน ทีม HR และบุคลากรสนับสนุน
* requirements/source/รายงาน/แก้ไขข้อมูลทนาย.pdf หน้า 1: แบบฟอร์มต้นทางมีข้อมูลเฉพาะทนาย เช่น ใบอนุญาตและอัตราค่าวิชาชีพ
* frontend/src/modules/entities/employees/components/EmployeeInformationSection.tsx และ EmployeeContactInformationSection.tsx: หน้าเพิ่ม/แก้ไขปัจจุบันใช้ฟอร์มพนักงานชุดเดียว`,
    priority: 'High',
    labels: ['พนักงาน', 'แบบฟอร์ม', 'คุณสมบัติวิชาชีพ'],
    relatedModules: ['hr', 'administration']
  })
]
