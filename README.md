# JavaScript Code Quest

เกมฝึกเขียน JavaScript สำหรับผู้เริ่มต้น 10 ด่าน (ด่านละ 10 XP รวม 100 XP)
เป็นเว็บไซต์แบบ static ล้วน (HTML + CSS + JavaScript) ไม่ต้องติดตั้ง Node.js ไม่มี backend และไม่โหลดไฟล์จากภายนอก

## วิธีเล่น (สำหรับนักเรียน)

1. เลือกด่านจากแผง "เลือกด่าน" (ด่านถัดไปจะปลดล็อกเมื่อผ่านด่านก่อนหน้า)
2. อ่านโจทย์และ "ผลลัพธ์ที่ต้องการ"
3. พิมพ์โค้ดลงใน **ช่องเส้นประสีม่วง** เท่านั้น (บรรทัดอื่นระบบเตรียมไว้ให้แล้ว)
4. กด **▶ รันโค้ด** (หรือ Enter) เพื่อดูผลลัพธ์กับค่าตัวอย่าง
5. กด **✓ ตรวจคำตอบ** (หรือ Ctrl+Enter) ระบบจะทดสอบกับค่าตัวแปรหลายชุด รวมถึงกรณีที่ซ่อนอยู่
6. ถ้ายังไม่ผ่าน ระบบจะบอกแนวทางแก้ไข หรือกด **💡 คำใบ้**
7. ผ่านแล้วได้ 10 XP และกด **ด่านถัดไป →** ได้ เล่นซ้ำด่านที่ผ่านแล้วได้ แต่ไม่ได้ XP ซ้ำ
8. ความคืบหน้าบันทึกในเบราว์เซอร์ (localStorage) อัตโนมัติ ปิดแล้วเปิดใหม่ยังอยู่

กติกาช่องเติมโค้ด: เขียน **นิพจน์เดียว** โดยใช้ชื่อตัวแปรที่โจทย์ให้มา
ห้ามใช้ `;` `{ }` `[ ]` `=` (กำหนดค่า) `=>` ลูป หรือฟังก์ชัน และห้ามพิมพ์คำตอบเป็นตัวเลขตายตัว เพราะค่าตัวแปรจะเปลี่ยนตอนตรวจ

| ด่าน | หัวข้อ | ภารกิจ |
|---|---|---|
| 1 | Arithmetic | รวมคะแนนทั้งหมด |
| 2 | Comparison | เปรียบเทียบคะแนนสอบ |
| 3 | Logical AND | ตรวจสิทธิ์เข้าสอบ |
| 4 | Logical OR | ตรวจบทบาทผู้ใช้ |
| 5 | Logical NOT | ตรวจบัญชีที่ถูกระงับ |
| 6 | Strict Equality | เปรียบเทียบค่าและชนิดข้อมูล |
| 7 | Combined Operators | ระบบสิทธิ์เข้าหน้าผู้ดูแล |
| 8 | Ternary Operator | คำนวณค่าจัดส่ง |
| 9 | E-Commerce | คำนวณส่วนลดและยอดรวม |
| 10 | Final Boss | ระบบชำระเงิน |

## ไฟล์

```
javascript-code-quest/
├── index.html      หน้าเว็บ
├── style.css       ธีมสีกรมท่า/ฟ้า/ม่วง, responsive
├── app.js          UI, ตัวตรวจคำตอบ, sandbox runner, localStorage
├── challenges.js   โจทย์ 10 ด่าน + กรณีทดสอบ + คำตอบอ้างอิง (เป็นฟังก์ชัน)
├── README.md
└── REPORT_TH.md    ผลการทดสอบ + รายงานส่งมอบครู
```

## ทดลองรันในเครื่อง

เปิด `index.html` ได้โดยตรง หรือรันเซิร์ฟเวอร์ static ใดก็ได้ เช่น `python3 -m http.server` แล้วเปิด `http://localhost:8000`

## Deploy บน GitHub Pages

1. สร้าง repository ใหม่แบบ **Public** ชื่อ `javascript-code-quest` ที่ https://github.com/new (ไม่ต้องติ๊กเพิ่ม README)
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ไว้ที่ root ของ repo
   - ผ่านเว็บ: หน้า repo → **Add file → Upload files** → ลากไฟล์ทั้ง 6 ไฟล์ → **Commit changes**
   - หรือผ่าน git:
     ```bash
     cd javascript-code-quest
     git init -b main
     git add .
     git commit -m "JavaScript Code Quest MVP"
     git remote add origin https://github.com/<ชื่อผู้ใช้>/javascript-code-quest.git
     git push -u origin main
     ```
3. ไปที่ **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main` / `/ (root)` → **Save**
4. รอ 1–2 นาที แล้วเปิด `https://<ชื่อผู้ใช้>.github.io/javascript-code-quest/`
5. ตรวจสอบ: หน้าเว็บมีสี (โหลด CSS ได้), เลือกด่าน 1 แล้วตอบ `homework + midterm + final` ต้องได้ +10 XP

ทุก path ในโปรเจกต์เป็น relative (`style.css`, `app.js`, `challenges.js`) จึงใช้ได้ใต้ sub-path ของ GitHub Pages

## การรันโค้ดของนักเรียนและความปลอดภัย

- หน้าเว็บหลัก **ไม่ใช้** `eval()` หรือ `new Function()`
- โค้ดนักเรียนผ่านตัวกรองก่อน: รับเฉพาะนิพจน์เดียว ใช้ได้เฉพาะชื่อตัวแปรของด่านนั้น และ `Math`, `Number`, `String`, `Boolean`, `true/false/null/undefined/NaN/Infinity`; ห้าม `; { } [ ] \` =`, `=>`, `++/--`, `.constructor`, `.prototype`, `.call/.apply/.bind`, `.repeat`, ตัวอักษรนอก ASCII นอกเครื่องหมายคำพูด
- รันใน iframe `sandbox="allow-scripts"` (ไม่มี `allow-same-origin` จึงเป็น opaque origin เข้าถึง DOM/localStorage ของหน้าหลักไม่ได้) และมี CSP ของตัวเองที่ปิดการเชื่อมต่อเครือข่าย
- ภายใน iframe รันโค้ดใน Web Worker เพื่อหยุดได้เมื่อเกิน 1.5 วินาที; ถ้า iframe ไม่ตอบภายใน 3 วินาที หน้าหลักจะทำลายและสร้าง iframe ใหม่ (ปุ่ม "รีเซ็ตตัวรัน" ทำแบบเดียวกัน)
- postMessage ใช้ execution ID แบบสุ่ม (crypto.getRandomValues) ทุกครั้ง และตรวจ `event.source` กับ `event.origin === "null"` ก่อนรับผล

## ข้อจำกัดที่ทราบ

- **ไม่ใช่ sandbox ที่ปลอดภัยระดับ production** การรัน JavaScript ในเบราว์เซอร์มีข้อจำกัดโดยธรรมชาติ ใช้เป็นเครื่องมือฝึกในห้องเรียนเท่านั้น
- เว็บเป็น static: นักเรียนเปิด DevTools อ่าน `challenges.js` (กรณีทดสอบและฟังก์ชันคำตอบอ้างอิง) หรือแก้ localStorage เพื่อเพิ่ม XP ได้ **คะแนนใช้เพื่อการฝึกเท่านั้น ไม่ใช่การสอบ**
- ความคืบหน้าเก็บต่อเบราว์เซอร์/เครื่อง ไม่ซิงก์ข้ามอุปกรณ์ และไม่มีระบบส่งคะแนนให้ครู
- รับเฉพาะนิพจน์เดียว (ไม่มี if/for/function) ตามขอบเขตของบทเรียนตัวดำเนินการ
- ทดสอบอัตโนมัติด้วย Chromium เท่านั้น ยังไม่ได้ทดสอบบน Safari/Firefox จริง (ถ้าเบราว์เซอร์ไม่อนุญาต Web Worker ใน sandbox ระบบจะรันใน iframe แทน ซึ่งยังมีตัวกรองป้องกันลูป แต่หยุดการคำนวณที่ค้างไม่ได้จนกว่าจะรีเซ็ต iframe)
- ใช้ฟอนต์ของระบบ (ไม่โหลด Google Fonts) หน้าตาจึงต่างกันเล็กน้อยตามเครื่อง
