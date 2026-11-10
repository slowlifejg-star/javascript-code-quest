/*
 * JavaScript Code Quest — challenge definitions
 *
 * Each challenge:
 *   code      : starter code lines. The line containing "____" is the student's editable area.
 *   params    : variable names available to the student's expression.
 *   cases     : test inputs. cases[0] is the visible example (matches the starter code);
 *               the remaining cases are hidden tests (only pass/fail is shown).
 *   solve     : reference behaviour used to compute the expected value for every case.
 *   required  : operators the answer must use (checked outside string literals).
 *   forbidden : operators the answer must not use.
 *
 * NOTE: This is a static site. Students can open DevTools and read this file.
 * Scores are for practice only, not for secure examinations.
 */
(function () {
  "use strict";

  function checkoutCase(subtotal, isMember, couponCode) {
    var discount = isMember ? subtotal * 0.1 : 0;
    return {
      subtotal: subtotal,
      isMember: isMember,
      couponCode: couponCode,
      discount: discount,
      afterDiscount: subtotal - discount
    };
  }

  window.CHALLENGES = [
    {
      id: 1,
      topic: "Arithmetic",
      title: "รวมคะแนนทั้งหมด",
      statement: "นักเรียนมีคะแนน 3 ส่วน คือ การบ้าน (homework) สอบกลางภาค (midterm) และสอบปลายภาค (final)\nจงเขียนนิพจน์คำนวณคะแนนรวม total จากตัวแปรทั้งสาม",
      expected: "ตัวอย่าง: homework = 20, midterm = 30, final = 40 → แสดงผล 90\nโค้ดต้องใช้ได้กับคะแนนชุดอื่นด้วย",
      code: [
        "// ตัวแปรที่ระบบเตรียมไว้ (ค่าจะเปลี่ยนตอนตรวจคำตอบ)",
        "let homework = 20;",
        "let midterm = 30;",
        "let final = 40;",
        "",
        "let total = ____;",
        "console.log(total);"
      ],
      params: ["homework", "midterm", "final"],
      cases: [
        { homework: 20, midterm: 30, final: 40 },
        { homework: 10, midterm: 0, final: 5 },
        { homework: 0, midterm: 0, final: 0 },
        { homework: 15.5, midterm: 20, final: 30 },
        { homework: 18, midterm: 27, final: 33 }
      ],
      solve: function (v) { return v.homework + v.midterm + v.final; },
      required: ["+"],
      forbidden: [],
      hint: "ใช้ตัวดำเนินการบวก + เชื่อมชื่อตัวแปรทั้งสามตัว อย่าพิมพ์ตัวเลขตรง ๆ เพราะค่าจะเปลี่ยนตอนตรวจ"
    },
    {
      id: 2,
      topic: "Comparison",
      title: "เปรียบเทียบคะแนนสอบ",
      statement: "จงตรวจสอบว่าคะแนนของเรา (myScore) มากกว่าคะแนนของเพื่อน (friendScore) หรือไม่\nผลลัพธ์ต้องเป็น true หรือ false",
      expected: "ตัวอย่าง: myScore = 78, friendScore = 65 → แสดงผล true\nถ้าคะแนนเท่ากัน ต้องได้ false",
      code: [
        "let myScore = 78;",
        "let friendScore = 65;",
        "",
        "let isHigher = ____;",
        "console.log(isHigher);"
      ],
      params: ["myScore", "friendScore"],
      cases: [
        { myScore: 78, friendScore: 65 },
        { myScore: 50, friendScore: 90 },
        { myScore: 70, friendScore: 70 },
        { myScore: 100, friendScore: 99 },
        { myScore: 0, friendScore: 1 }
      ],
      solve: function (v) { return v.myScore > v.friendScore; },
      required: [],
      forbidden: [],
      hint: "ใช้ตัวดำเนินการเปรียบเทียบ เช่น >, <, >=, <= ลองคิดว่ากรณีคะแนนเท่ากันควรได้ผลอะไร"
    },
    {
      id: 3,
      topic: "Logical AND",
      title: "ตรวจสิทธิ์เข้าสอบ",
      statement: "นักเรียนจะมีสิทธิ์สอบได้ก็ต่อเมื่อ\n• คะแนนเก็บ (score) ตั้งแต่ 50 ขึ้นไป และ\n• เวลาเรียน (attendance) ตั้งแต่ 80 ขึ้นไป\nต้องผ่านทั้งสองเงื่อนไข",
      expected: "ตัวอย่าง: score = 65, attendance = 92 → แสดงผล true\nถ้าเงื่อนไขใดไม่ผ่าน ต้องได้ false",
      code: [
        "let score = 65;",
        "let attendance = 92;",
        "",
        "let canTakeExam = ____;",
        "console.log(canTakeExam);"
      ],
      params: ["score", "attendance"],
      cases: [
        { score: 65, attendance: 92 },
        { score: 50, attendance: 80 },
        { score: 49, attendance: 95 },
        { score: 90, attendance: 79 },
        { score: 30, attendance: 40 }
      ],
      solve: function (v) { return v.score >= 50 && v.attendance >= 80; },
      required: ["&&"],
      forbidden: [],
      hint: "ใช้ && (และ) เชื่อมสองเงื่อนไข ระวังคำว่า \"ตั้งแต่\" หมายถึงรวมค่านั้นด้วย (>=)"
    },
    {
      id: 4,
      topic: "Logical OR",
      title: "ตรวจบทบาทผู้ใช้",
      statement: "ผู้ใช้จะแก้ไขบทความได้ถ้าบทบาท (role) เป็น \"admin\" หรือ \"editor\" อย่างใดอย่างหนึ่ง\nให้ใช้ === ในการเปรียบเทียบข้อความ",
      expected: "ตัวอย่าง: role = \"editor\" → แสดงผล true\nบทบาทอื่น เช่น \"viewer\" ต้องได้ false (ตัวพิมพ์เล็ก-ใหญ่มีผล)",
      code: [
        "let role = \"editor\";",
        "",
        "let canEdit = ____;",
        "console.log(canEdit);"
      ],
      params: ["role"],
      cases: [
        { role: "editor" },
        { role: "admin" },
        { role: "viewer" },
        { role: "Admin" },
        { role: "" }
      ],
      solve: function (v) { return v.role === "admin" || v.role === "editor"; },
      required: ["||", "==="],
      forbidden: [],
      hint: "เขียนการเปรียบเทียบสองชุด เช่น role === \"...\" แล้วเชื่อมด้วย || (หรือ)"
    },
    {
      id: 5,
      topic: "Logical NOT",
      title: "ตรวจบัญชีที่ถูกระงับ",
      statement: "ผู้ใช้จะเข้าสู่ระบบได้เมื่อ\n• ยืนยันอีเมลแล้ว (isVerified เป็น true) และ\n• บัญชีไม่ได้ถูกระงับ (isSuspended เป็น false)\nให้ใช้ตัวดำเนินการ ! (NOT)",
      expected: "ตัวอย่าง: isVerified = true, isSuspended = false → แสดงผล true",
      code: [
        "let isVerified = true;",
        "let isSuspended = false;",
        "",
        "let canLogin = ____;",
        "console.log(canLogin);"
      ],
      params: ["isVerified", "isSuspended"],
      cases: [
        { isVerified: true, isSuspended: false },
        { isVerified: true, isSuspended: true },
        { isVerified: false, isSuspended: false },
        { isVerified: false, isSuspended: true }
      ],
      solve: function (v) { return v.isVerified && !v.isSuspended; },
      required: ["!", "&&"],
      forbidden: [],
      hint: "!isSuspended แปลว่า \"ไม่ได้ถูกระงับ\" แล้วนำไปเชื่อมกับ isVerified ด้วย &&"
    },
    {
      id: 6,
      topic: "Strict Equality",
      title: "เปรียบเทียบค่าและชนิดข้อมูล",
      statement: "ระบบรับค่าจากฟอร์ม (inputValue) และค่าที่บันทึกไว้ (savedValue)\nจงตรวจว่าทั้งสองค่าเท่ากันทั้ง \"ค่า\" และ \"ชนิดข้อมูล\" หรือไม่\nห้ามใช้ == แบบไม่เข้มงวด",
      expected: "ตัวอย่าง: inputValue = \"5\", savedValue = 5 → แสดงผล false\nเพราะ \"5\" เป็น string ส่วน 5 เป็น number",
      code: [
        "let inputValue = \"5\";",
        "let savedValue = 5;",
        "",
        "let isSame = ____;",
        "console.log(isSame);"
      ],
      params: ["inputValue", "savedValue"],
      cases: [
        { inputValue: "5", savedValue: 5 },
        { inputValue: 5, savedValue: 5 },
        { inputValue: 0, savedValue: false },
        { inputValue: "hello", savedValue: "hello" },
        { inputValue: "", savedValue: 0 }
      ],
      solve: function (v) { return v.inputValue === v.savedValue; },
      required: ["==="],
      forbidden: ["=="],
      hint: "=== ตรวจทั้งค่าและชนิดข้อมูล ส่วน == จะแปลงชนิดข้อมูลก่อนเทียบ ทำให้ \"5\" == 5 เป็น true"
    },
    {
      id: 7,
      topic: "Combined Operators",
      title: "ระบบสิทธิ์เข้าหน้าผู้ดูแล",
      statement: "ผู้ใช้จะเข้าหน้าผู้ดูแลได้เมื่อครบทุกข้อ\n• เข้าสู่ระบบแล้ว (isLoggedIn)\n• บทบาท (role) เป็น \"admin\" หรือ \"owner\"\n• ไม่ได้ถูกแบน (isBanned เป็น false)",
      expected: "ตัวอย่าง: isLoggedIn = true, role = \"owner\", isBanned = false → แสดงผล true",
      code: [
        "let isLoggedIn = true;",
        "let role = \"owner\";",
        "let isBanned = false;",
        "",
        "let canAccessAdmin = ____;",
        "console.log(canAccessAdmin);"
      ],
      params: ["isLoggedIn", "role", "isBanned"],
      cases: [
        { isLoggedIn: true, role: "owner", isBanned: false },
        { isLoggedIn: true, role: "admin", isBanned: false },
        { isLoggedIn: false, role: "admin", isBanned: false },
        { isLoggedIn: true, role: "member", isBanned: false },
        { isLoggedIn: true, role: "admin", isBanned: true },
        { isLoggedIn: false, role: "owner", isBanned: false }
      ],
      solve: function (v) {
        return v.isLoggedIn && (v.role === "admin" || v.role === "owner") && !v.isBanned;
      },
      required: ["&&", "||", "!", "==="],
      forbidden: [],
      hint: "ใช้วงเล็บครอบเงื่อนไขของ role ที่เชื่อมด้วย || ก่อน แล้วค่อยเชื่อมกับเงื่อนไขอื่นด้วย &&"
    },
    {
      id: 8,
      topic: "Ternary Operator",
      title: "คำนวณค่าจัดส่ง",
      statement: "ร้านค้าออนไลน์มีกติกาค่าจัดส่ง\n• ยอดซื้อ (total) ตั้งแต่ 500 บาท → ส่งฟรี (0)\n• ต่ำกว่า 500 บาท → ค่าส่ง 50 บาท\nให้ใช้ตัวดำเนินการ ternary  เงื่อนไข ? ค่า1 : ค่า2",
      expected: "ตัวอย่าง: total = 350 → แสดงผล 50\nผลลัพธ์ต้องเป็นตัวเลข (number)",
      code: [
        "let total = 350;",
        "",
        "let shippingFee = ____;",
        "console.log(shippingFee);"
      ],
      params: ["total"],
      cases: [
        { total: 350 },
        { total: 500 },
        { total: 499 },
        { total: 1200 },
        { total: 0 }
      ],
      solve: function (v) { return v.total >= 500 ? 0 : 50; },
      required: ["?", ":"],
      forbidden: [],
      hint: "รูปแบบคือ (เงื่อนไข) ? ค่าเมื่อจริง : ค่าเมื่อเท็จ ระวังกรณียอดซื้อเท่ากับ 500 พอดี"
    },
    {
      id: 9,
      topic: "E-Commerce",
      title: "คำนวณส่วนลดและยอดรวม",
      statement: "จงคำนวณยอดที่ลูกค้าต้องจ่าย (finalTotal)\n• ราคาต่อชิ้น price\n• จำนวน quantity\n• ส่วนลดเป็นเปอร์เซ็นต์ discountPercent (เช่น 10 หมายถึง 10%)\nยอดสุทธิ = ราคารวม − ส่วนลด",
      expected: "ตัวอย่าง: price = 100, quantity = 2, discountPercent = 10 → แสดงผล 180",
      code: [
        "let price = 100;",
        "let quantity = 2;",
        "let discountPercent = 10;",
        "",
        "let finalTotal = ____;",
        "console.log(finalTotal);"
      ],
      params: ["price", "quantity", "discountPercent"],
      cases: [
        { price: 100, quantity: 2, discountPercent: 10 },
        { price: 250, quantity: 4, discountPercent: 0 },
        { price: 80, quantity: 5, discountPercent: 25 },
        { price: 99, quantity: 1, discountPercent: 50 },
        { price: 40, quantity: 3, discountPercent: 100 }
      ],
      solve: function (v) {
        var gross = v.price * v.quantity;
        return gross - gross * v.discountPercent / 100;
      },
      required: ["*"],
      forbidden: [],
      hint: "ราคารวม = price * quantity และส่วนลด = ราคารวม * discountPercent / 100 ใช้วงเล็บช่วยจัดลำดับการคำนวณ"
    },
    {
      id: 10,
      topic: "Final Boss",
      title: "บอสใหญ่: ระบบชำระเงิน",
      statement: "ระบบคำนวณส่วนลดสมาชิกไว้ให้แล้ว (afterDiscount คือยอดหลังหักส่วนลด)\nจงคำนวณยอดชำระสุทธิ total = afterDiscount + ค่าจัดส่ง โดยค่าจัดส่งคือ\n• ส่งฟรี (0) ถ้า afterDiscount ตั้งแต่ 1000 บาท หรือ ใช้คูปอง couponCode เป็น \"FREESHIP\"\n• นอกนั้นค่าส่ง 60 บาท",
      expected: "ตัวอย่าง: subtotal = 800, isMember = true, couponCode = \"\" → afterDiscount = 720 → แสดงผล 780\nเขียนทั้งหมดในนิพจน์เดียว",
      code: [
        "let subtotal = 800;",
        "let isMember = true;",
        "let couponCode = \"\";",
        "",
        "// ระบบเตรียมไว้ให้แล้ว",
        "let discount = isMember ? subtotal * 0.1 : 0;",
        "let afterDiscount = subtotal - discount;",
        "",
        "let total = ____;",
        "console.log(total);"
      ],
      params: ["subtotal", "isMember", "couponCode", "discount", "afterDiscount"],
      cases: [
        checkoutCase(800, true, ""),
        checkoutCase(1200, false, ""),
        checkoutCase(1100, true, ""),
        checkoutCase(1000, false, ""),
        checkoutCase(300, false, "FREESHIP"),
        checkoutCase(300, true, "freeship"),
        checkoutCase(999, false, "SALE10")
      ],
      solve: function (v) {
        return v.afterDiscount + (v.afterDiscount >= 1000 || v.couponCode === "FREESHIP" ? 0 : 60);
      },
      required: ["+", "?", ":", "||", "==="],
      forbidden: [],
      hint: "แยกคิดเป็นสองส่วน: afterDiscount + (เงื่อนไขส่งฟรี ? 0 : 60) เงื่อนไขส่งฟรีใช้ >= และ === เชื่อมด้วย || อย่าลืมวงเล็บรอบ ternary"
    }
  ];
})();
