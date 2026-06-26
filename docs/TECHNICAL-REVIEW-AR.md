# مراجعة تقنية — SaaS Subscription Management

مراجعة Backend شاملة للمشروع من منظور Senior Node.js Engineer، مع التركيز على تعدد الشركات (Multi-Tenancy)، المحاسبة بالقيد المزدوج، والجاهزية للمقابلة التقنية.

---

## 1. هيكل المشروع والمعمارية

### ما يعمل بشكل جيد

```
src/
├── controllers/dashboard/   → طبقة HTTP (رفيعة)
├── helpers/accounting/      → منطق مالي (Domain)
├── helpers/dashboard/       → Auth + DTOs
├── models/                  → Sequelize حسب المجال
├── middleware/auth/         → حماية الجلسة
├── routes/dashboard/        → كل الـ API تحت /dashboard
└── database/migrations/     → Schema واحد نظيف
```

**نقاط القوة:**

- فصل واضح: الـ Controllers تفوّض لـ `helpers/accounting/*`.
- `postJournalEntry` و `postJournalByCodes` يمركزان القيد المزدوج — تصميم سليم.
- `ApiResponse` + `errorHandler` + i18n — نمط API موحّد.
- Dashboard (EJS) + REST على نفس `/dashboard` — عملي للـ demo والمقابلة.

### الفجوات

| المشكلة                                                | التأثير                                           |
| ------------------------------------------------------ | ------------------------------------------------- |
| لا يوجد مجلد `services/` صريح — المحاسبة في `helpers/` | مقبول للمقابلة؛ الأفضل إعادة التسمية في الإنتاج   |
| لا يوجد Validation (Joi/Zod)                           | الـ Controllers تتحقق يدوياً بـ `if (!field)` فقط |
| `findByPk` بدون `tenantId` بعد إنشاء اشتراك            | خطر منخفض؛ لكن غير متسق                           |
| بقايا كود POS (`uploadFiles`, `geo/*`)                 | ضوضاء — يُفضّل حذفها قبل المقابلة                 |

**الحكم:** الهيكل **قوي لمهمة مقابلة**. منطق المجال في المكان الصحيح؛ الـ Validation وتسمية الطبقات تحتاج تحسين.

---

## 2. تقييم Multi-Tenancy (مهم جداً)

### كيف يعمل العزل حالياً

1. **التسجيل** ينشئ `Tenant` + `TenantUser` + دليل حسابات.
2. **`requireDashboardSession`** يقرأ JWT ويضع `req.tenantId` من الـ payload.
3. **Controllers** تستخدم `tenantWhere(req)` أو `{ tenantId: req.tenantId }`.
4. **خدمات المحاسبة** تستقبل `tenantId` كمعامل صريح.

```javascript
// نمط جيد — مستخدم باستمرار
const tenantWhere = (req, extra = {}) => ({ tenantId: req.tenantId, ...extra });
```

### مراجعة عزل البيانات

| المنطقة                       | `tenantId` مفلتر؟                                        | الخطر    |
| ----------------------------- | -------------------------------------------------------- | -------- |
| CRUD الخطط / العملاء          | نعم                                                      | منخفض    |
| إنشاء اشتراك                  | يتحقق من customer + plan تحت نفس الـ tenant              | منخفض    |
| الفوترة / المدفوعات / الإيراد | نعم                                                      | منخفض    |
| التقارير                      | نعم                                                      | منخفض    |
| `getAccountBalance`           | الحساب بـ `tenantId`؛ القيود عبر `JournalEntry.tenantId` | منخفض    |
| `findByPk` بعد الإنشاء        | لا                                                       | منخفض    |
| `UserToken` عند Auth          | بدون `tenantId`                                          | متوسط    |
| تسجيل الدخول بالإيميل         | **بحث عام على كل الـ tenants**                           | **عالي** |

### خطر عالي: الإيميل عند Login غير مربوط بالشركة

```javascript
// src/helpers/dashboard/tenantAuth.js
TenantUser.findOne({
  where: { email: normalizeEmail(email), status: { [Op.ne]: "delete" } },
});
```

الفهرس `(tenantId, email)` يسمح **بنفس الإيميل في شركات مختلفة**. `findOne` يرجع tenant عشوائي → دخول لشركة خاطئة.

**الحلول:**

- إضافة `companySlug` أو `tenantId` في نموذج Login.
- أو جعل الإيميل **فريداً عالمياً** (`UNIQUE` على `email` فقط).

### خطر متوسط: JWT `tenantId` غير مطابق لقاعدة البيانات

```javascript
req.tenantId = tenantId; // من JWT فقط
```

لا يوجد تحقق: `user.tenantId === payload.tenantId`.

**الإصلاح المقترح:**

```javascript
if (Number(user.tenantId) !== Number(tenantId)) {
  return errorHandler(res, "unauthorized", "invalidToken");
}
req.tenantId = user.tenantId; // الثقة بقاعدة البيانات وليس JWT وحده
```

### خطر متوسط: لا يوجد Row-Level Security على PostgreSQL

العزل على مستوى التطبيق فقط. أي استعلام ينسى `tenantId` = تسريب بيانات.

**الحكم:** العزل **صحيح في معظم المسارات**، لكن **bug الإيميل عند Login يجب إصلاحه قبل العرض**.

---

## 3. قاعدة البيانات والنماذج

### نقاط القوة

- `tenantId` كـ FK على كل الجداول مع `CASCADE`.
- `tbl_accounts (tenantId, code)` فريد — دليل حسابات لكل شركة.
- `tbl_tenant_users (tenantId, email)` فريد.
- `JournalEntry` + `JournalLine` — شكل قيد مزدوج كلاسيكي.
- `revenueRecognizedAt` على الفواتير — يدعم الإيراد المؤجل.
- `DECIMAL(14,2)` للأموال — النوع الصحيح.

### فهارس ناقصة (مقترحة)

```sql
CREATE INDEX idx_subscriptions_billing ON tbl_subscriptions(tenant_id, status, next_billing_date);
CREATE UNIQUE INDEX idx_invoices_period ON tbl_invoices(tenant_id, subscription_id, period_start, period_end);
CREATE INDEX idx_journal_entries_tenant_date ON tbl_journal_entries(tenant_id, entry_date);
CREATE INDEX idx_invoices_tenant_status ON tbl_invoices(tenant_id, status, revenue_recognized_at);
```

### قيود ناقصة

- لا يوجد تحقق DB أن `customerId` على الاشتراك ينتمي لنفس `tenantId`.
- لا يوجد `CHECK` على `debit/credit >= 0` في سطور القيد.
- لا يوجد قيد DB أن القيد متوازن (Debit = Credit).

**تصميم Journal:** مناسب للمقابلة. الإنتاج قد يضيف `tenantId` على `JournalLine` لتسهيل التقارير و RLS.

---

## 4. المحاسبة والمنطق المالي (القسم الحرج)

### ملخص التدفق

```
الفوترة     → مدين: AR        | دائن: إيراد مؤجل
الدفع       → مدين: نقدية     | دائن: AR
اعتراف إيراد → مدين: مؤجل    | دائن: إيراد اشتراكات
```

### إنشاء الفاتورة (`billingService.js`) — صحيح

- Debit = Credit = المبلغ عبر `assertBalanced`.
- نمط SaaS الصحيح: الإيراد **مؤجل** عند الفوترة وليس فورياً.
- فحص تكرار `(subscriptionId, periodStart, periodEnd)` — نية جيدة.

**مشاكل:**

| المشكلة                                                                       | الخطورة |
| ----------------------------------------------------------------------------- | ------- |
| Race condition: لا يوجد قفل على الاشتراك؛ فوترتان متوازيتان قد تُنشئ فاتورتين | متوسط   |
| خطط `annual` تُتجاهل؛ دائماً `addMonths(1)`                                   | متوسط   |
| لا يوجد `UNIQUE` على مستوى DB لفترة الفاتورة                                  | متوسط   |

### تسجيل الدفعة (`paymentService.js`) — صحيح

- `SELECT ... FOR UPDATE` على الفاتورة — ممتاز.
- الدفع الكامل فقط (`المبلغ = قيمة الفاتورة`) — مقبول للمقابلة.
- لا يدعم دفعات جزئية.

### اعتراف الإيراد (`revenueService.js`) — منطق صحيح، تزامن ضعيف

- صحيح: تحويل الالتزام (Deferred) إلى إيراد بعد الدفع وانتهاء الفترة.
- فلاتر: `paid` + `revenueRecognizedAt IS NULL` + `periodEnd <= periodEnd`.

**فجوة:** لا يوجد row lock؛ تشغيلان متوازيان قد يُكرران الاعتراف.

**الإصلاح:**

```javascript
const invoice = await Invoice.findOne({
  where: { id, tenantId, status: "paid", revenueRecognizedAt: null },
  transaction,
  lock: transaction.LOCK.UPDATE,
});
```

### محرك المحاسبة — قوي

- كل العمليات المالية داخل `transaction` + `assertBalanced`.
- `toMoney` يتجنب أخطاء الفاصلة العائمة.
- `postJournalByCodes` يحل الحسابات لكل tenant.

### التقارير — صحيحة لكن مبسطة

- قائمة الدخل: صافي credits على حساب الإيراد — صحيح لنموذج بإيرادات فقط.
- الميزانية: نقدية + AR + مؤجل — **ليست ميزانية GAAP كاملة** (لا حقوق ملكية). مناسبة للمقابلة مع توضيح أنها "ملخص".

### حكم المحاسبة

| التدفق         | قيد مزدوج | إيراد مؤجل | Transactions  |
| -------------- | --------- | ---------- | ------------- |
| الفوترة        | نعم       | نعم        | نعم           |
| الدفع          | نعم       | —          | نعم + قفل     |
| اعتراف الإيراد | نعم       | نعم        | نعم، بدون قفل |

**الخلاصة:** المحاسبة **قوية للمقابلة**. الإصلاحات الرئيسية: أقفال التزامن، الفوترة السنوية، فهرس فريد للفواتير.

---

## 5. الأمان وأفضل الممارسات

| المجال                    | الحالة                  | ملاحظات                              |
| ------------------------- | ----------------------- | ------------------------------------ |
| تشفير كلمة المرور         | جيد                     | bcrypt                               |
| JWT + Session + UserToken | جيد                     | إلغاء التوكن من السيرفر              |
| `tenantId` من الـ body    | غير مستخدم              | جيد                                  |
| Validation                | ضعيف                    | بدون Joi/Zod                         |
| CSRF                      | غير مفعّل على الداشبورد | وثّق المخاطرة                        |
| Rate limiting             | كان يحجب الداشبورد      | تم إصلاحه                            |
| الأسرار                   | defaults في الكود       | يجب secrets قوية في الإنتاج          |
| Session store             | MemoryStore             | لا يعمل مع عدة instances على Railway |
| SQL injection             | Sequelize               | خطر منخفض                            |

---

## 6. الأداء وقابلية التوسع

| عنق الزجاجة         | التفاصيل                          |
| ------------------- | --------------------------------- |
| `getAccountBalance` | يحمّل كل سطور القيد — O(n)        |
| حلقة الفوترة        | تسلسلية — مناسبة لمئات الاشتراكات |
| فهارس ناقصة         | انظر القسم 3                      |
| Memory session      | ينكسر مع replicas متعددة          |

---

## 7. تحسينات حسب الأولوية

### أولوية عالية (قبل المقابلة)

1. إصلاح غموض الإيميل عند Login (tenant scope أو إيميل فريد عالمياً).
2. التحقق من `user.tenantId === jwt.tenantId` في `requireDashboardSession`.
3. Row locks على اعتراف الإيراد (والفوترة على الاشتراك).
4. فهرس `UNIQUE` على `(tenantId, subscriptionId, periodStart, periodEnd)`.
5. رفع إصلاح `server.js` لـ Railway (`PORT`, `0.0.0.0`).
6. تدوير أسرار DB و JWT إذا ظهرت في الشات أو screenshots.

### أولوية متوسطة

7. Joi/Zod لكل POST bodies.
8. احترام `plan.billingCycle` (شهري / سنوي).
9. دفعات جزئية وحالة فاتورة أغنى.
10. Session store على PostgreSQL أو Redis.
11. Idempotency على `billing/run` و `payments`.
12. حذف كود POS القديم.

### Nice-to-have

13. ميزانية عمومية كاملة (خصوم + حقوق ملكية).
14. Audit log للأحداث المالية.
15. PostgreSQL RLS لكل `tenantId`.
16. Unit tests لـ `assertBalanced` وكل تدفق مالي.
17. Cron تلقائي للفوترة الشهرية.

---

## 8. نقاط تتكلم بيها في المقابلة

1. «عزل البيانات عبر `tenantId` في كل استعلام — لا نأخذه أبداً من الـ client.»
2. «الإيراد المؤجل: الفاتورة تُنشئ التزاماً؛ الاعتراف بالإيراد لاحقاً حسب الفترة.»
3. «كل حدث مالي يمر بقيد متوازن داخل transaction.»
4. «الدفع يستخدم pessimistic locking لمنع الدفع المزدوج.»
5. **بصراحة:** «لا RLS بعد، قائمة الدخل مبسطة، دورة الفوترة السنوية مُعرّفة لكن غير مكتملة في الكود.»

---

## 9. التقييم النهائي (سياق المقابلة)

| المجال         | الدرجة | تعليق                                 |
| -------------- | ------ | ------------------------------------- |
| المعمارية      | 8/10   | نظيف وعملي                            |
| Multi-Tenancy  | 7/10   | أنماط جيدة؛ bug الإيميل               |
| قاعدة البيانات | 8/10   | Schema قوي؛ فهارس ناقصة               |
| المحاسبة       | 9/10   | قيد مزدوج وإيراد مؤجل صحيح            |
| الأمان         | 6/10   | Auth جيد؛ validation و session ضعيفان |
| جاهزية الإنتاج | 6/10   | قابل للنشر على Railway بعد إصلاحات    |

---

## الخلاصة

مشروع **قوي للمقابلة التقنية**. تدفقات المحاسبة صحيحة فعلاً. أصلح غموض Login والتحقق من `tenantId` في الجلسة، وأضف فهرس فريد للفواتير وأقفال الصفوف — وستقدر تدافع عنه بثقة كـ Senior Backend Engineer.

---

_آخر تحديث: يونيو 2026_
